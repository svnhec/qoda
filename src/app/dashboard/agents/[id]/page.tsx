/**
 * Agent Detail Page
 * =============================================================================
 * Shows agent details with budget status and allows editing.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { parseAgent, type AgentRow } from "@/lib/db/types";
import { formatCurrency, subtractCents, formatCentsAsDecimal } from "@/lib/types/currency";
import { AgentEditForm } from "./agent-edit-form";
import { AgentActions } from "./agent-actions";
import { IssueCardButton } from "./issue-card-button";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
    const { id: agentId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect(`/auth/login?redirect=/dashboard/agents/${agentId}`);
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

    // Get agent with client info
    const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select(`
      *,
      clients (
        id,
        name
      )
    `)
        .eq("id", agentId)
        .eq("organization_id", organizationId)
        .single();

    if (agentError || !agentData) {
        notFound();
    }

    // Parse the agent (string → BigInt for money fields)
    const agent = parseAgent(agentData as AgentRow);
    const clientInfo = (agentData as { clients?: { id: string; name: string } }).clients;

    // Get virtual cards for this agent
    const { data: cardsData } = await supabase
        .from("virtual_cards")
        .select("id, last4, brand, is_active, spending_limit_cents, current_spend_cents")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

    // Define card type for Supabase response
    interface CardData {
        id: string;
        last4: string;
        brand: string;
        is_active: boolean;
        spending_limit_cents: string;
        current_spend_cents: string;
    }
    const cards = (cardsData || []) as CardData[];

    // Get all clients for the edit form
    const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");

    const clients = clientsData || [];

    // Calculate budget status
    const remaining = subtractCents(agent.monthly_budget_cents, agent.current_spend_cents);
    const isOverBudget = remaining < 0n;
    const usagePercent = agent.monthly_budget_cents > 0n
        ? Number((agent.current_spend_cents * 100n) / agent.monthly_budget_cents)
        : 0;

    // Check if Stripe is connected for card issuance
    const { data: org } = await supabase
        .from("organizations")
        .select("stripe_account_verified_at")
        .eq("id", organizationId)
        .single();

    const canIssueCards = !!org?.stripe_account_verified_at;

    // Check user's role in the organization (for card issuance permission)
    const { data: membership } = await supabase
        .from("org_members")
        .select("role, accepted_at")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

    const isAdminOrOwner = !!(
        membership &&
        ["owner", "admin"].includes(membership.role) &&
        membership.accepted_at
    );

    // Check if agent already has an active card
    const hasActiveCard = cards.some((card) => card.is_active);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Back Link */}
            <Link
                href="/dashboard/agents"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Agents
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-foreground">{agent.name}</h1>
                        <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${agent.is_active
                                ? "bg-green-500/10 text-green-600"
                                : "bg-muted text-muted-foreground"
                                }`}
                        >
                            {agent.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    {agent.description && (
                        <p className="mt-2 text-muted-foreground">{agent.description}</p>
                    )}
                    {clientInfo && (
                        <p className="mt-1 text-sm">
                            <span className="text-muted-foreground">Client:</span>{" "}
                            <Link
                                href={`/dashboard/clients/${clientInfo.id}`}
                                className="text-primary hover:underline"
                            >
                                {clientInfo.name}
                            </Link>
                        </p>
                    )}
                </div>
                <AgentActions agent={agent} />
            </div>

            {/* Budget Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {formatCurrency(agent.monthly_budget_cents)}
                            </p>
                            <p className="text-sm text-muted-foreground">Monthly Budget</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${isOverBudget ? "bg-destructive/10" : "bg-orange-500/10"} flex items-center justify-center`}>
                            <TrendingUp className={`w-5 h-5 ${isOverBudget ? "text-destructive" : "text-orange-500"}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {formatCurrency(agent.current_spend_cents)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Current Spend ({usagePercent}%)
                            </p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${isOverBudget ? "bg-destructive/10" : "bg-green-500/10"} flex items-center justify-center`}>
                            <AlertTriangle className={`w-5 h-5 ${isOverBudget ? "text-destructive" : "text-green-500"}`} />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
                                {formatCurrency(remaining)}
                            </p>
                            <p className="text-sm text-muted-foreground">Remaining</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-foreground">{cards.length}</p>
                            <p className="text-sm text-muted-foreground">Virtual Cards</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Budget Progress Bar */}
            {agent.monthly_budget_cents > 0n && (
                <div className="mb-8 p-4 rounded-xl border border-border bg-card">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Budget Usage</span>
                        <span className="text-sm text-muted-foreground">{usagePercent}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${usagePercent >= 100 ? "bg-destructive" :
                                usagePercent >= 80 ? "bg-orange-500" :
                                    "bg-primary"
                                }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Content Sections */}
            <div className="space-y-8">
                {/* Agent Details Form */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-6">Agent Details</h2>
                    <AgentEditForm
                        agent={agent}
                        clients={clients}
                        defaultBudgetDollars={formatCentsAsDecimal(agent.monthly_budget_cents)}
                    />
                </div>

                {/* Virtual Cards */}
                <div className="rounded-xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-foreground">Virtual Cards</h2>
                        <IssueCardButton
                            agentId={agent.id}
                            agentName={agent.name}
                            canIssueCards={canIssueCards}
                            isAdminOrOwner={isAdminOrOwner}
                            hasActiveCard={hasActiveCard}
                            monthlyBudgetCents={agent.monthly_budget_cents.toString()}
                        />
                    </div>

                    {!canIssueCards && (
                        <div className="p-4 rounded-lg bg-muted/50 border border-border mb-4">
                            <p className="text-sm text-muted-foreground">
                                <strong className="text-foreground">Stripe not connected.</strong>{" "}
                                <Link href="/dashboard/settings/connect" className="text-primary hover:underline">
                                    Connect your Stripe account
                                </Link>{" "}
                                to issue virtual cards.
                            </p>
                        </div>
                    )}

                    {cards.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-lg">
                            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No cards issued yet</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {cards.map((card) => (
                                <li
                                    key={card.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {card.brand} •••• {card.last4}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Limit: {formatCurrency(BigInt(card.spending_limit_cents))}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${card.is_active
                                            ? "bg-green-500/10 text-green-600"
                                            : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {card.is_active ? "Active" : "Inactive"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
