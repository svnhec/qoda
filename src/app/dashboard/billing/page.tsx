/**
 * Client Billing Portal
 * =============================================================================
 * Dashboard page for managing client billing, viewing spend, and exporting
 * statements. Shows all clients with their current month spend, subscription
 * status, and invoice links.
 *
 * Dependencies: Prompts 13-14 (billing setup, daily aggregation)
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    DollarSign,
    TrendingUp,
    CreditCard,
    ExternalLink,
    FileSpreadsheet,
    Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DownloadStatementButton } from "./download-statement-button";

/**
 * Client billing data with aggregated spend info.
 */
interface ClientBillingData {
    id: string;
    name: string;
    contact_email: string | null;
    is_active: boolean;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    current_month_spend_cents: bigint;
    current_month_markup_cents: bigint;
    transaction_count: number;
    subscription_status: "active" | "trialing" | "past_due" | "canceled" | "none";
}

import { formatCurrency } from "@/lib/types/currency";

/**
 * Get the current billing period string (e.g., "2026-01").
 */
function getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function BillingPage() {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth/login?redirect=/dashboard/billing");
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
    const currentPeriod = getCurrentBillingPeriod();

    // Fetch all clients with their billing data
    const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, contact_email, is_active, stripe_subscription_id, stripe_customer_id")
        .eq("organization_id", organizationId)
        .order("name");

    if (clientsError) {
        console.error("Failed to fetch clients:", clientsError);
    }

    // Get current month start/end
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // Fetch current month settlements for all clients
    const { data: settlements } = await supabase
        .from("transaction_settlements")
        .select("client_id, amount_cents, markup_fee_cents")
        .eq("organization_id", organizationId)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());

    // Aggregate settlements by client using BigInt
    const settlementsByClient = new Map<string, { spend: bigint; markup: bigint; count: number }>();
    for (const s of settlements ?? []) {
        if (!s.client_id) continue;
        const existing = settlementsByClient.get(s.client_id) ?? { spend: 0n, markup: 0n, count: 0 };
        settlementsByClient.set(s.client_id, {
            spend: existing.spend + BigInt(s.amount_cents),
            markup: existing.markup + BigInt(s.markup_fee_cents),
            count: existing.count + 1,
        });
    }

    // Build client billing data
    const clientBillingData: ClientBillingData[] = (clients ?? []).map((client) => {
        const clientSettlements = settlementsByClient.get(client.id);
        return {
            id: client.id,
            name: client.name,
            contact_email: client.contact_email,
            is_active: client.is_active,
            stripe_subscription_id: client.stripe_subscription_id,
            stripe_customer_id: client.stripe_customer_id,
            current_month_spend_cents: clientSettlements?.spend ?? 0n,
            current_month_markup_cents: clientSettlements?.markup ?? 0n,
            transaction_count: clientSettlements?.count ?? 0,
            subscription_status: client.stripe_subscription_id ? "active" : "none",
        };
    });

    // Calculate totals using BigInt
    const totalRevenue = clientBillingData.reduce((sum, c) => sum + c.current_month_markup_cents, 0n);
    const totalSpend = clientBillingData.reduce((sum, c) => sum + c.current_month_spend_cents, 0n);
    const totalRebill = totalSpend + totalRevenue;
    const activeClients = clientBillingData.filter((c) => c.subscription_status !== "none").length;
    const avgPerClient = activeClients > 0 ? totalRevenue / BigInt(activeClients) : 0n;

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Billing</h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage client billing, view revenue, and export statements.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/clients">
                        <Button variant="outline">
                            <CreditCard className="w-4 h-4" />
                            Manage Clients
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2 text-emerald-600">
                            <TrendingUp className="w-4 h-4" />
                            Markup Revenue
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-foreground">
                            {formatCurrency(totalRevenue)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {currentPeriod} (current month)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Total Spend
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-foreground">
                            {formatCurrency(totalSpend)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Agent transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Total Rebilled
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-foreground">
                            {formatCurrency(totalRebill)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Spend + markup
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4" />
                            Avg per Client
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-foreground">
                            {formatCurrency(avgPerClient)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {activeClients} active clients
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Period Info */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                    Client Billing Overview
                </h2>
                <p className="text-sm text-muted-foreground">
                    Billing period: {currentPeriod}
                </p>
            </div>

            {/* Clients Billing Table */}
            {clientBillingData.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            No clients yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            Add clients and set up billing to start tracking revenue.
                        </p>
                        <Link href="/dashboard/clients/new">
                            <Button>Add Your First Client</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Client</TableHead>
                                <TableHead className="text-right">Current Month Spend</TableHead>
                                <TableHead className="text-right">Markup</TableHead>
                                <TableHead className="text-right">Total Rebill</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientBillingData.map((client) => {
                                const totalRebillClient =
                                    client.current_month_spend_cents + client.current_month_markup_cents;

                                return (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div>
                                                <Link
                                                    href={`/dashboard/clients/${client.id}`}
                                                    className="font-medium text-foreground hover:text-primary transition-colors"
                                                >
                                                    {client.name}
                                                </Link>
                                                {client.contact_email && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {client.contact_email}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {formatCurrency(client.current_month_spend_cents)}
                                            {client.transaction_count > 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    {client.transaction_count} transactions
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-emerald-600">
                                            +{formatCurrency(client.current_month_markup_cents)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-medium">
                                            {formatCurrency(totalRebillClient)}
                                        </TableCell>
                                        <TableCell>
                                            <SubscriptionStatusBadge status={client.subscription_status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <DownloadStatementButton
                                                    clientId={client.id}
                                                    clientName={client.name}
                                                />
                                                {client.stripe_customer_id && (
                                                    <Link
                                                        href={`https://dashboard.stripe.com/customers/${client.stripe_customer_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button variant="ghost" size="sm">
                                                            <ExternalLink className="w-4 h-4" />
                                                            Stripe
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Footer notes */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Spend is aggregated daily and pushed to Stripe Usage Records.
                    Invoices are generated at the end of each billing cycle based on metered usage.
                    To view invoices, click the Stripe link for each client.
                </p>
            </div>
        </div>
    );
}

/**
 * Subscription status badge component.
 */
function SubscriptionStatusBadge({
    status,
}: {
    status: ClientBillingData["subscription_status"];
}) {
    const styles = {
        active: "bg-green-500/10 text-green-600 border-green-500/20",
        trialing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        past_due: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        canceled: "bg-red-500/10 text-red-600 border-red-500/20",
        none: "bg-muted text-muted-foreground border-border",
    };

    const labels = {
        active: "Active",
        trialing: "Trial",
        past_due: "Past Due",
        canceled: "Canceled",
        none: "No Billing",
    };

    return (
        <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}
