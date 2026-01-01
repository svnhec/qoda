/**
 * POST /api/v1/agents/issue-card
 * =============================================================================
 * Issues a virtual card for an agent via Stripe Issuing.
 *
 * Requires: Organization admin or owner (accepted membership)
 *
 * Body:
 *   - agent_id: string (required)
 *   - spend_limit_cents: string (optional, parsed to BigInt)
 *   - allowed_merchants: string[] (optional, MCC codes)
 *
 * Returns:
 *   - 200: { success: true, card: { card_id, last4, exp_month, exp_year, brand } }
 *   - 400: { error: message, code: string }
 *   - 401: { error: "Unauthorized" }
 *   - 403: { error: "Forbidden" }
 *
 * NOTE: Does NOT return full PAN or CVC - PCI compliant.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditError } from "@/lib/db/audit";
import {
    issueVirtualCardForAgent,
    type IssueVirtualCardInput,
} from "@/lib/issuing";

// Environment variables
const ENABLE_STRIPE_ISSUING = process.env.ENABLE_STRIPE_ISSUING === "true";

/**
 * Request body schema
 */
interface IssueCardBody {
    agent_id: string;
    spend_limit_cents?: string;
    allowed_merchants?: string[];
}

export async function POST(request: NextRequest) {
    // Check if Stripe Issuing is enabled
    if (!ENABLE_STRIPE_ISSUING) {
        return NextResponse.json(
            {
                error: "Card issuance is not available",
                code: "FEATURE_DISABLED"
            },
            { status: 503 }
        );
    }

    try {
        // -------------------------------------------------------------------------
        // 1. Authenticate user via Supabase session cookies
        // -------------------------------------------------------------------------
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // -------------------------------------------------------------------------
        // 2. Get user's default organization from profile
        // -------------------------------------------------------------------------
        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.default_organization_id) {
            return NextResponse.json(
                { error: "No organization found. Please set up an organization first." },
                { status: 400 }
            );
        }

        const organizationId = profile.default_organization_id;

        // -------------------------------------------------------------------------
        // 3. Verify user is org member with role 'admin' or 'owner' and accepted
        // -------------------------------------------------------------------------
        const { data: membership, error: memberError } = await supabase
            .from("org_members")
            .select("role, accepted_at")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .single();

        if (memberError || !membership) {
            return NextResponse.json(
                { error: "You are not a member of this organization" },
                { status: 403 }
            );
        }

        // Must be owner or admin
        if (!["owner", "admin"].includes(membership.role)) {
            return NextResponse.json(
                { error: "Only organization owners and admins can issue cards" },
                { status: 403 }
            );
        }

        // Membership must be accepted
        if (!membership.accepted_at) {
            return NextResponse.json(
                { error: "Your membership has not been accepted yet" },
                { status: 403 }
            );
        }

        // -------------------------------------------------------------------------
        // 4. Parse and validate request body
        // -------------------------------------------------------------------------
        let body: IssueCardBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 }
            );
        }

        const { agent_id, spend_limit_cents, allowed_merchants } = body;

        // Validate agent_id is present
        if (!agent_id || typeof agent_id !== "string") {
            return NextResponse.json(
                { error: "agent_id is required and must be a string" },
                { status: 400 }
            );
        }

        // Validate UUID format
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(agent_id)) {
            return NextResponse.json(
                { error: "agent_id must be a valid UUID" },
                { status: 400 }
            );
        }

        // Parse spend_limit_cents to BigInt if provided
        let spendLimitCents: bigint | undefined;
        if (spend_limit_cents !== undefined) {
            try {
                // Handle both string and number inputs
                const value =
                    typeof spend_limit_cents === "string"
                        ? spend_limit_cents
                        : String(spend_limit_cents);

                // Remove any non-numeric characters except minus
                const cleanValue = value.replace(/[^0-9-]/g, "");

                if (!cleanValue || cleanValue === "-") {
                    throw new Error("Invalid amount");
                }

                spendLimitCents = BigInt(cleanValue);

                if (spendLimitCents <= 0n) {
                    return NextResponse.json(
                        { error: "spend_limit_cents must be a positive amount" },
                        { status: 400 }
                    );
                }
            } catch {
                return NextResponse.json(
                    { error: "spend_limit_cents must be a valid integer string" },
                    { status: 400 }
                );
            }
        }

        // Validate allowed_merchants if provided
        if (allowed_merchants !== undefined) {
            if (!Array.isArray(allowed_merchants)) {
                return NextResponse.json(
                    { error: "allowed_merchants must be an array of strings" },
                    { status: 400 }
                );
            }
            if (allowed_merchants.some((m) => typeof m !== "string")) {
                return NextResponse.json(
                    { error: "allowed_merchants must contain only strings" },
                    { status: 400 }
                );
            }
        }

        // -------------------------------------------------------------------------
        // 5. Call issueVirtualCardForAgent
        // -------------------------------------------------------------------------
        const input: IssueVirtualCardInput = {
            agent_id,
            organization_id: organizationId,
            spend_limit_cents: spendLimitCents,
            allowed_categories: allowed_merchants,
        };

        const result = await issueVirtualCardForAgent(input);

        // -------------------------------------------------------------------------
        // 6. Handle result
        // -------------------------------------------------------------------------
        if (!result.success) {
            // Map error codes to HTTP status codes
            const statusMap: Record<string, number> = {
                AGENT_NOT_FOUND: 404,
                ORGANIZATION_NOT_FOUND: 404,
                ORG_MISMATCH: 403,
                ORG_NOT_VERIFIED: 400,
                STRIPE_ACCOUNT_MISSING: 400,
                AGENT_INACTIVE: 400,
                NO_BUDGET_CONFIGURED: 400,
                STRIPE_CARDHOLDER_ERROR: 500,
                STRIPE_CARD_ERROR: 500,
                DATABASE_ERROR: 500,
                UNKNOWN_ERROR: 500,
            };

            const status = statusMap[result.code] || 400;

            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    code: result.code,
                },
                { status }
            );
        }

        // -------------------------------------------------------------------------
        // 7. Return success with masked card details (NO PAN, NO CVC)
        // -------------------------------------------------------------------------
        return NextResponse.json({
            success: true,
            card: {
                card_id: result.data.card_id,
                last4: result.data.last4,
                exp_month: result.data.exp_month,
                exp_year: result.data.exp_year,
                brand: result.data.brand,
            },
            is_existing: result.data.is_existing,
        });
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");

        console.error("Issue card API error:", error);

        await logAuditError({
            action: "api_issue_card",
            resourceType: "virtual_cards",
            error,
        });

        return NextResponse.json(
            {
                success: false,
                error: "An unexpected error occurred",
                code: "INTERNAL_ERROR",
            },
            { status: 500 }
        );
    }
}
