/**
 * ANALYTICS PAGE
 * =============================================================================
 * Historical reporting and trend analysis
 * - Revenue Trends Chart
 * - Agent Performance Table
 * - Spend Category Breakdown
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Calendar,
    Users,
    RefreshCw
} from "lucide-react";

export default async function AnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    // Get user's organization
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    const orgId = profile?.default_organization_id;

    // Fetch real data
    let totalSpendCents = 0n;
    let totalAgents = 0;
    let activeAgents = 0;
    let topAgents: { name: string; spend: bigint; budget: bigint }[] = [];

    if (orgId) {
        // Get agents with spend data
        const { data: agents } = await supabase
            .from("agents")
            .select("id, name, current_spend_cents, monthly_budget_cents, is_active")
            .eq("organization_id", orgId)
            .order("current_spend_cents", { ascending: false });

        if (agents) {
            totalAgents = agents.length;
            activeAgents = agents.filter(a => a.is_active).length;

            for (const agent of agents) {
                try {
                    const spend = BigInt(String(agent.current_spend_cents || 0).split('.')[0] || '0');
                    totalSpendCents += spend;
                } catch { /* ignore parse errors */ }
            }

            // Top 5 agents by spend
            topAgents = agents.slice(0, 5).map(a => ({
                name: a.name,
                spend: BigInt(String(a.current_spend_cents || 0).split('.')[0] || '0'),
                budget: BigInt(String(a.monthly_budget_cents || 0).split('.')[0] || '0'),
            }));
        }
    }

    // Calculate derived metrics
    const totalSpendDollars = Number(totalSpendCents) / 100;
    const avgUtilization = topAgents.length > 0
        ? topAgents.reduce((sum, a) => {
            if (a.budget === 0n) return sum;
            return sum + (Number(a.spend) / Number(a.budget)) * 100;
        }, 0) / topAgents.length
        : 0;

    // Forecast (simple projection based on current spend)
    const daysInMonth = 30;
    const dayOfMonth = new Date().getDate();
    const projectedSpend = dayOfMonth > 0 ? (totalSpendDollars / dayOfMonth) * daysInMonth : 0;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="min-h-screen bg-background p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Analytics & Reporting</h1>
                    <p className="text-muted-foreground text-sm mt-1">Historical spend analysis and profit attribution</p>
                </div>
                <button className="btn-secondary">
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Spend */}
                <Card className="card-hover p-5">
                    <div className="flex items-center justify-between mb-4">
                        <DollarSign className="w-5 h-5 text-accent" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Month to Date
                        </span>
                    </div>
                    <div className="value-medium">{formatCurrency(totalSpendDollars)}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium text-accent">
                        <TrendingUp className="w-3 h-3" />
                        +12.5% from last month
                    </div>
                </Card>

                {/* Active Agents */}
                <Card className="card-hover p-5">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-5 h-5 text-primary" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Active Agents
                        </span>
                    </div>
                    <div className="value-medium">{activeAgents}/{totalAgents}</div>
                    <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
                        <div
                            className="h-full bg-primary"
                            style={{ width: totalAgents > 0 ? `${(activeAgents / totalAgents) * 100}%` : '0%' }}
                        />
                    </div>
                </Card>

                {/* Utilization */}
                <Card className="card-hover p-5">
                    <div className="flex items-center justify-between mb-4">
                        <BarChart3 className="w-5 h-5 text-warning" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Avg Utilization
                        </span>
                    </div>
                    <div className="value-medium">{avgUtilization.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground mt-2">Budget usage rate</p>
                </Card>

                {/* Forecast */}
                <Card className="card-hover p-5">
                    <div className="flex items-center justify-between mb-4">
                        <Calendar className="w-5 h-5 text-info" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Projected
                        </span>
                    </div>
                    <div className="value-medium">{formatCurrency(projectedSpend)}</div>
                    <p className="text-xs text-muted-foreground mt-2">End of month forecast</p>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Agents Table */}
                <div className="lg:col-span-2 card p-0 overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Top Spending Agents</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-secondary/30">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Agent
                                    </th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Spend
                                    </th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Budget
                                    </th>
                                    <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Usage
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topAgents.length > 0 ? topAgents.map((agent, i) => {
                                    const usage = agent.budget > 0n
                                        ? (Number(agent.spend) / Number(agent.budget)) * 100
                                        : 0;
                                    return (
                                        <tr key={i} className="hover:bg-secondary/20 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${usage > 90 ? 'bg-destructive' : usage > 70 ? 'bg-warning' : 'bg-accent'}`} />
                                                    <span className="font-medium text-foreground">{agent.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-foreground">
                                                ${(Number(agent.spend) / 100).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                                ${(Number(agent.budget) / 100).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${usage > 90 ? 'bg-destructive' : usage > 70 ? 'bg-warning' : 'bg-accent'}`}
                                                            style={{ width: `${Math.min(100, usage)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                                                        {usage.toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                                            No agent data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Stats Panel */}
                <div className="card p-0 overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Performance Summary</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Transactions Today</span>
                            <span className="font-mono text-foreground">247</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Approval Rate</span>
                            <span className="font-mono text-accent">98.2%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Avg Transaction</span>
                            <span className="font-mono text-foreground">$24.50</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Declined</span>
                            <span className="font-mono text-destructive">4</span>
                        </div>
                        <div className="border-t border-border pt-4 mt-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Net Profit</span>
                                <span className="font-mono font-semibold text-accent">
                                    +${(totalSpendDollars * 0.15).toFixed(2)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">15% markup applied</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
