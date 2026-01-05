/**
 * Dashboard Stats API Route
 * =============================================================================
 * GET: Returns dashboard statistics for the current user's organization.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security";
import { logAuditError } from "@/lib/db/audit";

/**
 * GET /api/dashboard/stats - Get dashboard statistics
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const supabase = await createClient();

        // Get organization balance
        const { data: org } = await supabase
            .from("organizations")
            .select("issuing_balance_cents")
            .eq("id", auth.organizationId)
            .single();

        // Get agent counts
        const { count: totalAgents } = await supabase
            .from("agents")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", auth.organizationId);

        const { count: activeAgents } = await supabase
            .from("agents")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", auth.organizationId)
            .eq("is_active", true)
            .eq("status", "green");

        // Get client count
        const { count: totalClients } = await supabase
            .from("clients")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", auth.organizationId)
            .eq("is_active", true);

        // Get today's transaction stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        const { count: todayTransactions } = await supabase
            .from("transaction_logs")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", auth.organizationId)
            .gte("created_at", todayIso);

        // Get today's spend
        const { data: todaySpendData } = await supabase
            .from("transaction_logs")
            .select("amount_cents")
            .eq("organization_id", auth.organizationId)
            .eq("status", "approved")
            .gte("created_at", todayIso);

        const todaySpendCents = (todaySpendData || []).reduce(
            (sum, t) => sum + BigInt(t.amount_cents || 0),
            BigInt(0)
        );

        // Get total agent spend (month to date)
        const { data: agentSpendData } = await supabase
            .from("agents")
            .select("current_spend_cents")
            .eq("organization_id", auth.organizationId);

        const totalSpendCents = (agentSpendData || []).reduce(
            (sum, a) => sum + BigInt(a.current_spend_cents || 0),
            BigInt(0)
        );

        // Get unread alerts count
        const { count: unreadAlerts } = await supabase
            .from("alerts")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", auth.organizationId)
            .eq("is_read", false);

        return NextResponse.json({
            balance_cents: org?.issuing_balance_cents?.toString() || "0",
            total_agents: totalAgents || 0,
            active_agents: activeAgents || 0,
            total_clients: totalClients || 0,
            today_transactions: todayTransactions || 0,
            today_spend_cents: todaySpendCents.toString(),
            month_spend_cents: totalSpendCents.toString(),
            unread_alerts: unreadAlerts || 0,
        });
    } catch (err) {
        await logAuditError({
            action: "dashboard_stats",
            resourceType: "dashboard",
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

