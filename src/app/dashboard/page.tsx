/**
 * Dashboard Overview Page
 * =============================================================================
 * Main dashboard showing quick stats and actions.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Users, 
  DollarSign, 
  TrendingUp,
  ArrowRight,
  AlertTriangle
} from "lucide-react";

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

  // Get organization
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, stripe_account_verified_at, stripe_account_requirements_due")
    .eq("id", profile.default_organization_id)
    .single();

  const isStripeVerified = !!org?.stripe_account_verified_at;
  const hasStripeRequirements = (org?.stripe_account_requirements_due as unknown[])?.length > 0;

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your agency.
          </p>
        </div>

        {/* Stripe Connect CTA */}
        {!isStripeVerified && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {hasStripeRequirements ? (
                    <AlertTriangle className="w-10 h-10 text-yellow-500" />
                  ) : (
                    <CreditCard className="w-10 h-10 text-primary" />
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {hasStripeRequirements
                        ? "Complete Stripe Setup"
                        : "Connect Your Stripe Account"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {hasStripeRequirements
                        ? "Additional information is required to activate your account."
                        : "Set up Stripe to start issuing virtual cards for your agents."}
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href="/dashboard/settings/connect">
                    {hasStripeRequirements ? "Continue Setup" : "Connect Stripe"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Agents"
            value="0"
            description="Active AI agents"
            icon={CreditCard}
          />
          <StatsCard
            title="Clients"
            value="0"
            description="Active clients"
            icon={Users}
          />
          <StatsCard
            title="This Month"
            value="$0.00"
            description="Total spend"
            icon={DollarSign}
          />
          <StatsCard
            title="Revenue"
            value="$0.00"
            description="Markup earnings"
            icon={TrendingUp}
            highlight
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to manage your agency
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button variant="outline" className="justify-start" asChild disabled={!isStripeVerified}>
                <Link href="/dashboard/agents/new">
                  <CreditCard className="w-4 h-4 mr-2" />
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
                <Link href="/dashboard/settings/connect">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {isStripeVerified ? "Stripe Settings" : "Connect Stripe"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest transactions and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No recent activity
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${highlight ? "bg-primary/10" : "bg-muted"}`}>
            <Icon className={`w-5 h-5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

