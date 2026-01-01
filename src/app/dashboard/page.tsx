/**
 * Dashboard Overview Page
 * =============================================================================
 * Main dashboard showing organization status, quick stats, recent activity,
 * and setup wizard for incomplete organizations.
 *
 * Features:
 * - Welcome header with status badge
 * - Stats cards (spend, revenue, agents)
 * - Recent transactions table
 * - Quick action buttons
 * - Setup wizard for incomplete orgs
 *
 * Dependencies: All previous phases (Stripe Connect, Agents, Billing)
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Bot,
  Receipt,
  Settings,
  CheckCircle2,
  Circle,
  Loader2,
  Zap,
  ExternalLink,
} from "lucide-react";

/**
 * Organization setup status.
 */
type SetupStatus = "pending" | "in_progress" | "verified" | "ready";

/**
 * Get the organization setup status.
 */
function getSetupStatus(org: {
  stripe_account_id: string | null;
  stripe_account_verified_at: string | null;
}, agentCount: number): SetupStatus {
  if (!org.stripe_account_id) return "pending";
  if (!org.stripe_account_verified_at) return "in_progress";
  if (agentCount === 0) return "verified";
  return "ready";
}

import { formatCurrency } from "@/lib/types/currency";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Get user profile with org info
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("default_organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.default_organization_id) {
    redirect("/onboarding");
  }

  const organizationId = profile.default_organization_id;

  // Get organization details
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, stripe_account_id, stripe_account_verified_at, stripe_account_requirements_due, markup_percentage")
    .eq("id", organizationId)
    .single();

  if (!org) {
    redirect("/onboarding");
  }

  // Get current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Fetch stats in parallel
  const [
    { count: agentCount },
    { count: clientCount },
    { data: settlements },
    { data: recentTransactions },
  ] = await Promise.all([
    // Active agents count
    supabase
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    // Active clients count
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    // Current month settlements for spend/revenue
    supabase
      .from("transaction_settlements")
      .select("amount_cents, markup_fee_cents")
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),
    // Recent transactions (last 10)
    supabase
      .from("transaction_settlements")
      .select(`
        id,
        created_at,
        amount_cents,
        markup_fee_cents,
        merchant_name,
        agents!inner (
          name
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Calculate totals using BigInt
  const totalSpendCents = (settlements ?? []).reduce(
    (sum, s) => sum + BigInt(s.amount_cents),
    0n
  );
  const totalRevenueCents = (settlements ?? []).reduce(
    (sum, s) => sum + BigInt(s.markup_fee_cents),
    0n
  );

  // Determine setup status
  const setupStatus = getSetupStatus(org, agentCount ?? 0);
  const isSetupComplete = setupStatus === "ready";

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Status Badge */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                Welcome, {org.name}
              </h1>
              <StatusBadge status={setupStatus} />
            </div>
            <p className="mt-2 text-muted-foreground">
              {getStatusMessage(setupStatus)}
            </p>
          </div>
          {!isSetupComplete && (
            <SetupCTA status={setupStatus} />
          )}
        </div>

        {/* Setup Wizard (if not complete) */}
        {!isSetupComplete && (
          <SetupWizard status={setupStatus} />
        )}

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Spend"
            value={formatCurrency(totalSpendCents)}
            description="This month"
            icon={DollarSign}
          />
          <StatsCard
            title="Revenue"
            value={formatCurrency(totalRevenueCents)}
            description="Markup earnings"
            icon={TrendingUp}
            highlight
          />
          <StatsCard
            title="Active Agents"
            value={String(agentCount ?? 0)}
            description="AI agents with cards"
            icon={Bot}
          />
          <StatsCard
            title="Clients"
            value={String(clientCount ?? 0)}
            description="Active clients"
            icon={Users}
          />
        </div>

        {/* Quick Actions + Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks for your agency
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button
                variant="outline"
                className="justify-start"
                asChild
                disabled={setupStatus !== "ready" && setupStatus !== "verified"}
              >
                <Link href="/dashboard/agents/new">
                  <Bot className="w-4 h-4 mr-2" />
                  Create New Agent
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/clients/new">
                  <Users className="w-4 h-4 mr-2" />
                  Add New Client
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/billing">
                  <Receipt className="w-4 h-4 mr-2" />
                  View Billing
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest transactions from your agents
                  </CardDescription>
                </div>
                {(recentTransactions?.length ?? 0) > 0 && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/billing">
                      View All
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!recentTransactions || recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No transactions yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create an agent and issue a card to get started
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((tx) => {
                        const agent = tx.agents as unknown as { name: string };
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {agent?.name ?? "Unknown"}
                            </TableCell>
                            <TableCell>{tx.merchant_name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(BigInt(tx.amount_cents))}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                                Settled
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Status badge component.
 */
function StatusBadge({ status }: { status: SetupStatus }) {
  const styles = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    verified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    ready: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  const labels = {
    pending: "Pending Setup",
    in_progress: "Setup In Progress",
    verified: "Verified",
    ready: "Ready",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}
    >
      {status === "ready" && <CheckCircle2 className="w-4 h-4 mr-1" />}
      {status === "in_progress" && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
      {labels[status]}
    </span>
  );
}

/**
 * Get status message for the header.
 */
function getStatusMessage(status: SetupStatus): string {
  switch (status) {
    case "pending":
      return "Connect your Stripe account to start issuing virtual cards.";
    case "in_progress":
      return "Complete your Stripe verification to enable card issuance.";
    case "verified":
      return "Your account is verified! Create your first agent to get started.";
    case "ready":
      return "Your agency is fully set up and operational.";
  }
}

/**
 * Setup CTA button.
 */
function SetupCTA({ status }: { status: SetupStatus }) {
  const config = {
    pending: {
      href: "/dashboard/settings/connect",
      label: "Connect Stripe",
    },
    in_progress: {
      href: "/dashboard/settings/connect",
      label: "Continue Setup",
    },
    verified: {
      href: "/dashboard/agents/new",
      label: "Create First Agent",
    },
    ready: {
      href: "/dashboard/agents",
      label: "View Agents",
    },
  };

  const { href, label } = config[status];

  return (
    <Button asChild>
      <Link href={href}>
        {label}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Link>
    </Button>
  );
}

/**
 * Setup wizard component showing progress steps.
 */
function SetupWizard({ status }: { status: SetupStatus }) {
  const steps = [
    {
      id: "connect",
      title: "Connect Stripe",
      description: "Link your Stripe account for payments",
      completed: status !== "pending",
      current: status === "pending",
      href: "/dashboard/settings/connect",
    },
    {
      id: "verify",
      title: "Verify Account",
      description: "Complete Stripe verification requirements",
      completed: status === "verified" || status === "ready",
      current: status === "in_progress",
      href: "/dashboard/settings/connect",
    },
    {
      id: "agent",
      title: "Create First Agent",
      description: "Set up your first AI agent with a virtual card",
      completed: status === "ready",
      current: status === "verified",
      href: "/dashboard/agents/new",
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Complete Your Setup
        </CardTitle>
        <CardDescription>
          Follow these steps to start issuing virtual cards for your AI agents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 relative ${index < steps.length - 1
                  ? "md:before:absolute md:before:top-5 md:before:left-[calc(100%+0.5rem)] md:before:w-8 md:before:h-0.5 md:before:bg-border"
                  : ""
                }`}
            >
              <Link
                href={step.current ? step.href : "#"}
                className={`block p-4 rounded-lg border transition-all ${step.completed
                    ? "border-green-500/30 bg-green-500/5"
                    : step.current
                      ? "border-primary bg-primary/5 hover:bg-primary/10"
                      : "border-border bg-muted/30 opacity-60"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.completed
                        ? "bg-green-500 text-white"
                        : step.current
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`font-medium ${step.completed || step.current
                          ? "text-foreground"
                          : "text-muted-foreground"
                        }`}
                    >
                      Step {index + 1}: {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stats card component.
 */
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  highlight,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p
              className={`text-2xl font-bold mt-1 ${highlight ? "text-primary" : "text-foreground"
                }`}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${highlight ? "bg-primary/10" : "bg-muted"
              }`}
          >
            <Icon
              className={`w-6 h-6 ${highlight ? "text-primary" : "text-muted-foreground"
                }`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
