/* eslint-disable no-console */
/**
 * Clients List Page (CRM View)
 * 
 * Displays all clients for the user's organization with metrics.
 * RLS policies are now properly configured.
 */

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Search, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/types/currency";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ search?: string; sort?: string }> }) {
    // 1. Safe Param Await
    let params: { search?: string; sort?: string } = {};
    try {
        params = await searchParams;
    } catch (e) {
        console.error("Params error:", e);
    }

    // 2. Supabase Client (respects RLS)
    const supabase = await createClient();

    // 3. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return <div className="p-10 text-white">Authentication Error. Please log in again.</div>;
    }

    // 4. Org Check
    let profile = null;
    let orgId = null;

    try {
        // Use SERVICE client to fetch profile (bypass RLS on profile/orgs just in case)
        const { data } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();
        profile = data;
        orgId = profile?.default_organization_id;

        if (!orgId) {
            console.log("No default org found, trying fallback...");
            const { data: memberData } = await supabase
                .from("org_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .limit(1)
                .single();
            orgId = memberData?.organization_id;
        }
    } catch (e) {
        console.error("Profile fetch error:", e);
    }

    if (!orgId) {
        return (
            <div className="p-10 text-white flex flex-col items-center justify-center h-full">
                <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                <h2 className="text-xl font-bold">No Organization Found</h2>
                <p className="text-white/50 mb-6">You need to be part of an organization to view clients.</p>
                <Link href="/dashboard/settings">
                    <Button variant="outline">Check Settings</Button>
                </Link>
            </div>
        );
    }

    // 5. Data Fetch (SPLIT QUERY STRATEGY)
    let clientsWithMetrics: any[] = [];
    let fetchError = null;

    try {
        // A. Fetch Clients (Using Service Client)
        let clientQuery = supabase.from("clients").select("*").eq("organization_id", orgId);
        if (params.search) clientQuery = clientQuery.ilike("name", `%${params.search}%`);

        const { data: clients, error: clientError } = await clientQuery;
        if (clientError) throw new Error("Client fetch failed: " + clientError.message);

        // B. Fetch Agents (Using Service Client)
        const { data: agents, error: agentError } = await supabase
            .from("agents")
            .select("id, client_id, current_spend_cents, is_active")
            .eq("organization_id", orgId);

        if (agentError) throw new Error("Agent fetch failed: " + agentError.message);

        // 6. Memory Aggregation
        const agentMap = new Map();
        (agents || []).forEach(agent => {
            if (!agent.client_id) return;
            if (!agentMap.has(agent.client_id)) agentMap.set(agent.client_id, []);
            agentMap.get(agent.client_id).push(agent);
        });

        // 7. Transformation
        clientsWithMetrics = (clients || []).map((client: any) => {
            const clientAgents = agentMap.get(client.id) || [];
            const activeAgents = clientAgents.filter((a: any) => a.is_active).length;

            const totalSpendCents = clientAgents.reduce((sum: bigint, a: any) => {
                let val = 0n;
                try {
                    const spendValue = a.current_spend_cents;
                    if (spendValue != null) {
                        const strValue = String(spendValue);
                        const intPart = strValue.split('.')[0] || '0';
                        val = BigInt(intPart);
                    }
                } catch { }
                return sum + val;
            }, 0n);

            const markupPercent = 15;
            const profitCents = (totalSpendCents * BigInt(markupPercent)) / 100n;
            const markupCents = profitCents;

            return {
                ...client,
                activeAgents,
                totalSpendCents,
                profitCents,
                markupCents,
                totalRevenueCents: totalSpendCents + markupCents,
                markupPercent,
                billingStatus: 'paid'
            };
        });

    } catch (e: any) {
        const errorDetails = {
            message: e?.message || "Unknown error",
            details: e?.details || "No details",
            hint: e?.hint || "No hint",
            code: e?.code || "No code"
        };
        fetchError = JSON.stringify(errorDetails, null, 2);
        console.error("CLIENT PAGE ERROR:", errorDetails);
    }

    if (fetchError) {
        return (
            <div className="p-10 flex flex-col items-center">
                <AlertTriangle className="w-12 h-12 text-alert mb-4" />
                <h2 className="text-xl font-bold text-foreground">Error loading clients</h2>
                <pre className="text-muted-foreground mb-2 bg-secondary p-4 rounded text-xs overflow-auto max-w-2xl">{fetchError}</pre>
                <p className="text-muted-foreground text-sm">Please refresh or contact support.</p>
            </div>
        );
    }

    // 8. Render
    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8 min-h-screen bg-background text-foreground animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Client Portfolio</h1>
                    <p className="text-muted-foreground">Manage your detailed client ledger and profitability metrics.</p>
                </div>
                <Link href="/dashboard/clients/new">
                    <Button variant="default">
                        <Plus className="w-4 h-4" />
                        Add Client
                    </Button>
                </Link>
            </div>

            {/* Content */}
            {clientsWithMetrics.length === 0 ? (
                <Card variant="default"  className="p-16 text-center flex flex-col items-center justify-center border-dashed">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No clients found</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                        Get started by onboarding your first client account.
                    </p>
                    <Link href="/dashboard/clients/new">
                        <Button variant="outline">
                            Create First Client
                        </Button>
                    </Link>
                </Card>
            ) : (
                <Card variant="default"  className="overflow-hidden">
                    <Table>
                        <TableHeader className="bg-secondary/30">
                            <TableRow className="border-border hover:bg-secondary/40">
                                <TableHead className="pl-6 font-mono text-xs uppercase tracking-wider text-muted-foreground">Client Name</TableHead>
                                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Active Agents</TableHead>
                                <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Total Spend</TableHead>
                                <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Net Profit</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientsWithMetrics.map((client) => (
                                <TableRow key={client.id} className="border-border hover:bg-white/5 transition-colors">
                                    <TableCell className="pl-6 font-medium text-foreground">
                                        <div className="flex flex-col">
                                            <span>{client.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${client.activeAgents > 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-neutral-500"}`} />
                                            <span className="font-mono text-sm">{client.activeAgents}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">
                                        {formatCurrency(client.totalSpendCents)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="text-profit font-mono font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                            +{formatCurrency(client.profitCents)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Link href={`/dashboard/clients/${client.id}`}>
                                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                                                <Search className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
