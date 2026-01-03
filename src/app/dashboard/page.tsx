import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CockpitViewWrapper from "@/components/dashboard/cockpit/cockpit-wrapper";

/**
 * DASHBOARD HOME - Screen 5
 * =============================================================================
 * The "Money-Printing Cockpit"
 * Server component that fetches org context and passes to client
 * =============================================================================
 */

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/dashboard");

  // Get user's organization
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("default_organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.default_organization_id || null;

  // Get initial stats
  const initialStats = {
    activeAgents: 0,
    totalSpend: 0,
    dailyVolume: 0,
    riskScore: 15,
  };

  if (orgId) {
    const { data: agents } = await supabase
      .from("agents")
      .select("is_active, current_spend_cents")
      .eq("organization_id", orgId);

    if (agents) {
      initialStats.activeAgents = agents.filter(a => a.is_active).length;
      initialStats.totalSpend = agents.reduce((sum, a) => {
        try {
          return sum + Number(String(a.current_spend_cents || 0).split('.')[0]) / 100;
        } catch {
          return sum;
        }
      }, 0);
    }
  }

  return (
    <CockpitViewWrapper
      organizationId={orgId}
      initialStats={initialStats}
    />
  );
}
