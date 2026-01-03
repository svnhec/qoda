/**
 * API: Agent Spend Overview
 * =============================================================================
 * GET /api/agents/spend
 * 
 * Returns agent spend data for predictive cost alerts and dashboard.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get user's organization
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            return NextResponse.json(
                { error: "No organization found" },
                { status: 404 }
            );
        }

        const orgId = profile.default_organization_id;

        // Fetch agents with spend data
        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select(`
        id,
        name,
        monthly_budget_cents,
        current_spend_cents,
        current_velocity_cents_per_minute,
        status,
        is_active,
        client_id,
        today_spend_cents,
        today_date
      `)
            .eq("organization_id", orgId)
            .eq("is_active", true)
            .order("current_spend_cents", { ascending: false });

        if (agentsError) {
            console.error("Failed to fetch agents:", agentsError);
            return NextResponse.json(
                { error: "Failed to fetch agents" },
                { status: 500 }
            );
        }

        // Calculate summary stats
        const totalBudgetCents = agents.reduce(
            (sum, a) => sum + BigInt(a.monthly_budget_cents || '0'),
            0n
        );
        const totalSpendCents = agents.reduce(
            (sum, a) => sum + BigInt(a.current_spend_cents || '0'),
            0n
        );
        const totalVelocity = agents.reduce(
            (sum, a) => sum + BigInt(a.current_velocity_cents_per_minute || '0'),
            0n
        );

        // Count status
        const statusCounts = {
            green: agents.filter(a => a.status === 'green').length,
            yellow: agents.filter(a => a.status === 'yellow').length,
            red: agents.filter(a => a.status === 'red').length,
        };

        // Identify at-risk agents (>75% budget)
        const atRiskAgents = agents.filter(a => {
            const budget = BigInt(a.monthly_budget_cents || '1');
            const spend = BigInt(a.current_spend_cents || '0');
            return budget > 0n && (spend * 100n / budget) >= 75n;
        });

        return NextResponse.json({
            agents: agents.map(a => ({
                id: a.id,
                name: a.name,
                monthlyBudgetCents: a.monthly_budget_cents,
                currentSpendCents: a.current_spend_cents,
                currentVelocityCentsPerMinute: a.current_velocity_cents_per_minute || '0',
                status: a.status,
                isActive: a.is_active,
                clientId: a.client_id,
                todaySpendCents: a.today_spend_cents || '0',
                todayDate: a.today_date,
                percentUsed: BigInt(a.monthly_budget_cents || '1') > 0n
                    ? Number((BigInt(a.current_spend_cents || '0') * 100n) / BigInt(a.monthly_budget_cents || '1'))
                    : 0,
            })),
            summary: {
                totalAgents: agents.length,
                totalBudgetCents: totalBudgetCents.toString(),
                totalSpendCents: totalSpendCents.toString(),
                totalVelocityCentsPerMinute: totalVelocity.toString(),
                percentUsed: totalBudgetCents > 0n
                    ? Number((totalSpendCents * 100n) / totalBudgetCents)
                    : 0,
                statusCounts,
                atRiskCount: atRiskAgents.length,
            },
        });

    } catch (err) {
        console.error("Agent spend API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
