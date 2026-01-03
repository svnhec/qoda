/**
 * Onboarding Page - Qoda Design
 * =============================================================================
 * Wizard flow to set up Organization, Funding, Agent, and Card.
 * "Guided Launch" - Dark, focused, progressive disclosure.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingWizard from "./onboarding-wizard";

interface OrgData {
    id: string;
    name: string;
    stripe_account_id: string | null;
}

export default async function OnboardingPage() {
    const supabase = await createClient();

    // Check authentication
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login?redirect=/onboarding");
    }

    // Check if user already has an organization
    const { data: membership } = await supabase
        .from("org_members")
        .select("organization_id, organizations(id, name, stripe_account_id)")
        .eq("user_id", user.id)
        .single();

    // Extract organization data safely
    let existingOrg: OrgData | null = null;
    if (membership?.organizations) {
        // Supabase returns single relation as object, not array
        const orgData = membership.organizations;
        if (orgData && typeof orgData === 'object' && !Array.isArray(orgData)) {
            existingOrg = orgData as OrgData;
        } else if (Array.isArray(orgData) && orgData.length > 0) {
            existingOrg = orgData[0] as OrgData;
        }
    }

    // Get existing agents if org exists
    let agents: { id: string; name: string }[] = [];
    if (membership?.organization_id) {
        const { data: agentData } = await supabase
            .from("agents")
            .select("id, name")
            .eq("organization_id", membership.organization_id)
            .limit(5);
        agents = agentData || [];
    }

    // Determine initial step
    let initialStep = 1;
    if (existingOrg) {
        initialStep = 2; // Has org, go to funding
        if (existingOrg.stripe_account_id) {
            initialStep = 3; // Has Stripe, go to agent
            if (agents.length > 0) {
                initialStep = 4; // Has agent, go to card
            }
        }
    }

    // If fully onboarded, redirect to dashboard
    // if (initialStep === 4 && agents.length > 0) {
    //     redirect("/dashboard");
    // }

    return (
        <OnboardingWizard
            userId={user.id}
            userEmail={user.email || ""}
            userName={user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
            initialStep={initialStep}
            existingOrg={existingOrg}
            existingAgents={agents}
        />
    );
}
