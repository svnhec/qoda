/**
 * Funding Balance API Route
 * =============================================================================
 * GET: Returns the current balance for the organization.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security";
import { logAuditError } from "@/lib/db/audit";

/**
 * GET /api/funding/balance - Get organization balance
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const supabase = await createClient();

        const { data: org, error } = await supabase
            .from("organizations")
            .select("issuing_balance_cents")
            .eq("id", auth.organizationId)
            .single();

        if (error) {
            await logAuditError({
                action: "get_balance",
                resourceType: "organization",
                resourceId: auth.organizationId,
                error,
                userId: auth.user.id,
                organizationId: auth.organizationId,
            });
            return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
        }

        // Balance is stored as BIGINT, return as string for JSON serialization
        const balanceCents = org?.issuing_balance_cents?.toString() || "0";

        return NextResponse.json({
            balance_cents: balanceCents,
            currency: "USD",
        });
    } catch (err) {
        await logAuditError({
            action: "get_balance",
            resourceType: "organization",
            resourceId: auth.organizationId,
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

