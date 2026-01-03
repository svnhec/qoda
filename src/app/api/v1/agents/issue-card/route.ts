/**
 * POST /api/v1/agents/issue-card
 * =============================================================================
 * Issues a virtual card for an agent via Stripe Issuing (or mock mode).
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

// Environment variables
const ENABLE_STRIPE_ISSUING = process.env.ENABLE_STRIPE_ISSUING === "true";
const MOCK_CARD_ISSUANCE = process.env.MOCK_CARD_ISSUANCE !== "false"; // Default to true if not set

/**
 * Request body schema
 */
interface IssueCardBody {
    agent_id: string;
    spend_limit_cents?: string;
    allowed_merchants?: string[];
}

/**
 * Generate mock card data for demo purposes
 */
function generateMockCard(agentId: string) {
    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const expMonth = Math.floor(1 + Math.random() * 12);
    const expYear = new Date().getFullYear() + 3;

    return {
        card_id: `mock_card_${agentId.substring(0, 8)}_${Date.now()}`,
        last4,
        exp_month: expMonth,
        exp_year: expYear,
        brand: "visa",
        is_mock: true,
    };
}

export async function POST(request: NextRequest) {
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

        const { agent_id, spend_limit_cents } = body;

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

        // -------------------------------------------------------------------------
        // 5. Verify agent exists and belongs to this organization
        // -------------------------------------------------------------------------
        const { data: agent, error: agentError } = await supabase
            .from("agents")
            .select("id, name, organization_id, stripe_card_id")
            .eq("id", agent_id)
            .single();

        if (agentError || !agent) {
            return NextResponse.json(
                { error: "Agent not found", code: "AGENT_NOT_FOUND" },
                { status: 404 }
            );
        }

        if (agent.organization_id !== organizationId) {
            return NextResponse.json(
                { error: "Agent does not belong to your organization", code: "ORG_MISMATCH" },
                { status: 403 }
            );
        }

        // Check if agent already has a card
        if (agent.stripe_card_id) {
            return NextResponse.json({
                success: true,
                is_existing: true,
                card: {
                    card_id: agent.stripe_card_id,
                    last4: "••••",
                    exp_month: 12,
                    exp_year: new Date().getFullYear() + 2,
                    brand: "visa",
                },
                message: "Agent already has a card issued",
            });
        }

        // -------------------------------------------------------------------------
        // 6. Issue card (Real Stripe or Mock)
        // -------------------------------------------------------------------------
        if (ENABLE_STRIPE_ISSUING) {
            // Real Stripe Issuing - import and use the actual function
            const { issueVirtualCardForAgent } = await import("@/lib/issuing");

            // Parse spend_limit_cents to BigInt if provided
            let spendLimitCents: bigint | undefined;
            if (spend_limit_cents !== undefined) {
                try {
                    const value = typeof spend_limit_cents === "string"
                        ? spend_limit_cents
                        : String(spend_limit_cents);
                    const cleanValue = value.replace(/[^0-9-]/g, "");
                    if (cleanValue && cleanValue !== "-") {
                        spendLimitCents = BigInt(cleanValue);
                    }
                } catch {
                    // Ignore parse errors, use default
                }
            }

            const input = {
                agent_id,
                organization_id: organizationId,
                spend_limit_cents: spendLimitCents,
            };

            const result = await issueVirtualCardForAgent(input);

            if (!result.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: result.error,
                        code: result.code,
                    },
                    { status: 400 }
                );
            }

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
        } else if (MOCK_CARD_ISSUANCE) {
            // Mock mode - generate fake card data and update database
            const mockCard = generateMockCard(agent_id);

            // Update agent with mock card ID
            const { error: updateError } = await supabase
                .from("agents")
                .update({
                    stripe_card_id: mockCard.card_id,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", agent_id);

            if (updateError) {
                console.error("Failed to update agent with mock card:", updateError);
                return NextResponse.json(
                    { error: "Failed to save card information", code: "DATABASE_ERROR" },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                card: mockCard,
                is_existing: false,
                is_mock: true,
                message: "Mock card issued successfully. Connect Stripe Issuing for real cards.",
            });
        } else {
            // Neither Stripe nor mock enabled
            return NextResponse.json(
                {
                    error: "Card issuance is not available. Please configure Stripe Issuing.",
                    code: "FEATURE_DISABLED"
                },
                { status: 503 }
            );
        }
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
