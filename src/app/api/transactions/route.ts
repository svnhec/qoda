/**
 * Transactions API Route
 * =============================================================================
 * GET: Returns a list of transactions for the current user's organization.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security";
import { logAuditError } from "@/lib/db/audit";

/**
 * GET /api/transactions - List all transactions for the organization
 */
export async function GET(request: NextRequest) {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);
        const agentId = searchParams.get("agent_id");
        const status = searchParams.get("status");

        const supabase = await createClient();

        let query = supabase
            .from("transaction_logs")
            .select(`
                id,
                amount_cents,
                merchant_name,
                merchant_category,
                status,
                stripe_transaction_id,
                created_at,
                agent_id,
                agents(id, name)
            `, { count: "exact" })
            .eq("organization_id", auth.organizationId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (agentId) {
            query = query.eq("agent_id", agentId);
        }

        if (status) {
            query = query.eq("status", status);
        }

        const { data: transactions, error, count } = await query;

        if (error) {
            await logAuditError({
                action: "transactions_list",
                resourceType: "transactions",
                error,
                userId: auth.user.id,
                organizationId: auth.organizationId,
            });
            return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
        }

        // Serialize BigInt values for JSON
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
            action: "transactions_list",
            resourceType: "transactions",
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

