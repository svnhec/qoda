/**
 * ADD FUNDS PAGE
 * =============================================================================
 * Funding page for Stripe Issuing balance:
 * - Current balance display
 * - Add funds via card/ACH
 * - Auto top-up settings
 * - Transaction history
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FundingView } from "@/components/dashboard/settings/funding-view";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Funding & Balance | Qoda",
    description: "Manage issuing balance and top-up settings.",
};

export default async function FundingPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login?redirect=/dashboard/settings/fund");

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) redirect("/dashboard?error=no_organization");

    // Fetch organization with funding info
    const { data: org } = await supabase
        .from("organizations")
        .select(`
            id,
            name,
            stripe_account_id,
            issuing_balance_cents,
            auto_topup_enabled,
            auto_topup_threshold_cents,
            auto_topup_amount_cents
        `)
        .eq("id", profile.default_organization_id)
        .single();

    // Fetch recent funding transactions
    const { data: fundingHistory } = await supabase
        .from("funding_transactions")
        .select("*")
        .eq("organization_id", profile.default_organization_id)
        .order("created_at", { ascending: false })
        .limit(10);

    return (
        <FundingView
            organization={org}
            fundingHistory={fundingHistory || []}
        />
    );
}
