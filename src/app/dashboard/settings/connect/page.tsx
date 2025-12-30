/**
 * Stripe Connect Onboarding Page
 * =============================================================================
 * Shows onboarding status and allows agencies to connect their Stripe account.
 * 
 * States:
 * 1. Not started - Show "Connect to Stripe" button
 * 2. In progress - Show pending requirements
 * 3. Verified - Show green checkmark
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConnectStatus } from "./connect-status";

interface PageProps {
  searchParams: Promise<{
    success?: string;
    reauth?: string;
  }>;
}

export default async function ConnectPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?redirect=/dashboard/settings/connect");
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

  // Get organization details including Stripe status
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      stripe_account_id,
      stripe_account_verified_at,
      stripe_account_requirements_due
    `)
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    redirect("/dashboard?error=organization_not_found");
  }

  // Get user's role in the organization
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .not("accepted_at", "is", null)
    .single();

  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "admin" || isOwner;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Stripe Connect
          </h1>
          <p className="mt-2 text-muted-foreground">
            Connect your Stripe account to issue virtual cards and receive payouts.
          </p>
        </div>

        {/* Connect Status Component */}
        <ConnectStatus
          organizationId={org.id}
          organizationName={org.name}
          stripeAccountId={org.stripe_account_id}
          stripeAccountVerifiedAt={org.stripe_account_verified_at}
          stripeAccountRequirementsDue={org.stripe_account_requirements_due as string[] || []}
          isOwner={isOwner}
          isAdmin={isAdmin}
          showSuccessToast={params.success === "true"}
          showReauthWarning={params.reauth === "true"}
        />
      </div>
    </div>
  );
}

