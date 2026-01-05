/**
 * Funding History API Route
 * =============================================================================
 * GET: Returns funding transaction history for the organization.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security";
import { logAuditError } from "@/lib/db/audit";

/**
 * GET /api/funding/history - Get funding transaction history
 */
export async function GET(request: NextRequest) {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);

        const supabase = await createClient();

        const { data: transactions, error, count } = await supabase
            .from("funding_transactions")
            .select(`
                id,
                amount_cents,
                currency,
                transaction_type,
                status,
                description,
                processed_at,
                created_at
            `, { count: "exact" })
            .eq("organization_id", auth.organizationId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            await logAuditError({
                action: "funding_history",
                resourceType: "funding_transactions",
                error,
                userId: auth.user.id,
                organizationId: auth.organizationId,
            });
            return NextResponse.json({ error: "Failed to fetch funding history" }, { status: 500 });
        }

        // Convert amount_cents to strings for JSON serialization (BigInt safety)
        const serializedTransactions = (transactions || []).map(t => ({
            ...t,
            amount_cents: t.amount_cents?.toString() || "0",
        }));

        return NextResponse.json({
            transactions: serializedTransactions,
            total: count || 0,
            limit,
            offset,
        });
    } catch (err) {
        await logAuditError({
            action: "funding_history",
            resourceType: "funding_transactions",
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

