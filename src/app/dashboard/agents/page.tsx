/**
 * Agents List Page
 * =============================================================================
 * Shows all agents for the organization with budget info.
 * Uses Server Components for data fetching (RLS enforced).
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Bot, CreditCard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { parseAgents, type AgentRow } from "@/lib/db/types";
import { formatCurrency, subtractCents } from "@/lib/types/currency";

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

    // Get current user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth/login?redirect=/dashboard/agents");
    }

    // Get user's default organization
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) {
        redirect("/dashboard?error=no_organization");
    }

    const organizationId = profile.default_organization_id;

    // Build query
    let query = supabase
        .from("agents")
        .select(`
      *,
      clients (
        id,
        name
      )
    `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

    // Apply search filter
    if (params.search) {
        query = query.ilike("name", `%${params.search}%`);
    }

    // Apply active filter
    if (params.is_active !== undefined) {
        query = query.eq("is_active", params.is_active === "true");
    }

    // Apply client filter
    if (params.client_id) {
        query = query.eq("client_id", params.client_id);
    }

    const { data: agentsData, error } = await query;

    if (error) {
        console.error("Failed to fetch agents:", error);
    }

    // Parse agents (string → BigInt for money fields)
    const agents = parseAgents((agentsData || []) as AgentRow[]);

    // Add client info back after parsing
    const agentsWithClients = agents.map((agent, index) => ({
        ...agent,
        client: (agentsData?.[index] as { clients?: { id: string; name: string } })?.clients,
    }));

    const activeCount = agents.filter((a) => a.is_active).length;

    // Calculate total budget and spend
    const totalBudget = agents.reduce((sum, a) => sum + a.monthly_budget_cents, 0n);
    const totalSpend = agents.reduce((sum, a) => sum + a.current_spend_cents, 0n);

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Agents</h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage your AI agents and their spending budgets.
                    </p>
                </div>
                <Link href="/dashboard/agents/new">
                    <Button>
                        <Plus className="w-4 h-4" />
                        Add Agent
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{agents.length}</p>
                            <p className="text-sm text-muted-foreground">Total Agents</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                            <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBudget)}</p>
                            <p className="text-sm text-muted-foreground">Total Budget</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSpend)}</p>
                            <p className="text-sm text-muted-foreground">Total Spend</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-4 mb-6">
                <form className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            name="search"
                            placeholder="Search agents..."
                            defaultValue={params.search}
                            className="pl-10"
                        />
                    </div>
                </form>
                <div className="flex gap-2">
                    <Link href="/dashboard/agents">
                        <Button variant={!params.is_active ? "default" : "outline"} size="sm">
                            All
                        </Button>
                    </Link>
                    <Link href="/dashboard/agents?is_active=true">
                        <Button variant={params.is_active === "true" ? "default" : "outline"} size="sm">
                            Active
                        </Button>
                    </Link>
                    <Link href="/dashboard/agents?is_active=false">
                        <Button variant={params.is_active === "false" ? "default" : "outline"} size="sm">
                            Inactive
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Agents Table */}
            {agents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No agents yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Create your first agent to start managing AI spend.
                    </p>
                    <Link href="/dashboard/agents/new">
                        <Button>
                            <Plus className="w-4 h-4" />
                            Add Your First Agent
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Name</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Budget</TableHead>
                                <TableHead>Spent</TableHead>
                                <TableHead>Remaining</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agentsWithClients.map((agent) => {
                                const remaining = subtractCents(agent.monthly_budget_cents, agent.current_spend_cents);
                                const isOverBudget = remaining < 0n;
                                const usagePercent = agent.monthly_budget_cents > 0n
                                    ? Number((agent.current_spend_cents * 100n) / agent.monthly_budget_cents)
                                    : 0;

                                return (
                                    <TableRow key={agent.id}>
                                        <TableCell>
                                            <Link
                                                href={`/dashboard/agents/${agent.id}`}
                                                className="font-medium text-foreground hover:text-primary transition-colors"
                                            >
                                                {agent.name}
                                            </Link>
                                            {agent.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                    {agent.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {agent.client ? (
                                                <Link
                                                    href={`/dashboard/clients/${agent.client.id}`}
                                                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {agent.client.name}
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatCurrency(agent.monthly_budget_cents)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={isOverBudget ? "text-destructive" : ""}>
                                                    {formatCurrency(agent.current_spend_cents)}
                                                </span>
                                                {usagePercent > 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({usagePercent}%)
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-medium ${isOverBudget ? "text-destructive" : "text-green-600"}`}>
                                                {formatCurrency(remaining)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${agent.is_active
                                                    ? "bg-green-500/10 text-green-600"
                                                    : "bg-muted text-muted-foreground"
                                                    }`}
                                            >
                                                {agent.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
