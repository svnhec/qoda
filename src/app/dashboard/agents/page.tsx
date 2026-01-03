/**
 * Agents List Page (Fleet Command)
 * =============================================================================
 * "Fleet Command" view for managing AI agents.
 * Features specialized high-density table with kill-switches.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Bot, Zap, AlertTriangle, CheckCircle } from "lucide-react";
import { logger } from "@/lib/logger";
import { parseAgents, type AgentRow } from "@/lib/db/types";
import { AgentTable } from "@/components/dashboard/agent-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PageProps {
    searchParams: Promise<{
        search?: string;
        is_active?: string;
        client_id?: string;
    }>;
}

export default async function AgentsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login?redirect=/dashboard/agents");

    // Get Org
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    const orgId = profile?.default_organization_id;

    let agentsData: AgentRow[] | null = [];
    let error = null;

    if (orgId) {
        // Fetch Agents only if we have an Org ID
        let query = supabase
            .from("agents")
            .select(`*, clients (id, name)`)
            .eq("organization_id", orgId)
            .order("created_at", { ascending: false });

        // Filters
        if (params.search) query = query.ilike("name", `%${params.search}%`);
        if (params.is_active !== undefined) query = query.eq("is_active", params.is_active === "true");

        const result = await query;
        agentsData = result.data as AgentRow[];
        error = result.error;
    } else {
        // No Org ID means no agents visible
        agentsData = [];
    }

    if (error) logger.error("Failed to fetch agents", { error: (error as any).message });

    // Transform Data for UI
    const rawAgents = parseAgents((agentsData || []) as AgentRow[]);
    const tableAgents = rawAgents.map((agent, i) => ({
        id: agent.id,
        name: agent.name,
        client: (agentsData?.[i] as { clients?: { id: string; name: string } })?.clients,
        monthly_budget_cents: agent.monthly_budget_cents,
        current_spend_cents: agent.current_spend_cents,
        is_active: agent.is_active,
        last_active: "Active 2m ago"
    }));

    return (
        <div className="flex min-h-screen bg-background text-foreground animate-in fade-in duration-500">
            {/* Collapsible Filter Sidebar */}
            <div className="hidden lg:block w-72 border-r border-border p-6 bg-muted/40">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Filters</h2>
                    </div>

                    {/* Quick Filters */}
                    <div className="space-y-3">
                        <div className="text-xs text-muted-foreground/50 uppercase tracking-wider font-bold mb-2">Status</div>
                        <div className="space-y-1">
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white/5 transition-colors group">
                                <input
                                    type="radio"
                                    name="status"
                                    value="all"
                                    defaultChecked={!params.is_active}
                                    className="appearance-none w-4 h-4 rounded-full border border-border bg-secondary checked:bg-primary checked:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                />
                                <span className={!params.is_active ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"}>All Agents</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white/5 transition-colors group">
                                <input
                                    type="radio"
                                    name="status"
                                    value="active"
                                    defaultChecked={params.is_active === "true"}
                                    className="appearance-none w-4 h-4 rounded-full border border-border bg-secondary checked:bg-emerald-500 checked:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                />
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                <span className={params.is_active === "true" ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"}>Active</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white/5 transition-colors group">
                                <input
                                    type="radio"
                                    name="status"
                                    value="paused"
                                    defaultChecked={params.is_active === "false"}
                                    className="appearance-none w-4 h-4 rounded-full border border-border bg-secondary checked:bg-amber-500 checked:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                />
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span className={params.is_active === "false" ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"}>Paused</span>
                            </label>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                        <div className="text-xs text-muted-foreground/50 uppercase tracking-wider font-bold mb-2">Views</div>
                        <div className="space-y-1">
                            <button className="w-full flex items-center gap-3 px-2 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors">
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                High Velocity
                            </button>
                            <button className="w-full flex items-center gap-3 px-2 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                Budget Alerts
                            </button>
                            <button className="w-full flex items-center gap-3 px-2 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                Healthy Agents
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2 mb-1">
                            <Bot className="w-6 h-6 text-primary" />
                            Fleet Command
                        </h1>
                        <p className="text-muted-foreground text-sm">Manage your deployed AI agents and their authorized budgets.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <form className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                name="search"
                                defaultValue={params.search}
                                placeholder="Find agent..."
                                className="pl-9 w-64 bg-secondary border-transparent shadow-inner transition-colors"
                            />
                        </form>
                        <Link href="/dashboard/agents/new">
                            <Button variant="default">
                                <Plus className="w-4 h-4" />
                                Deploy Agent
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Main Content */}
                <AgentTable agents={tableAgents} />
            </div>
        </div>
    );
}
