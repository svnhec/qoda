/**
 * Create New Agent Page (Provisioning Wizard)
 * =============================================================================
 * Focused modal-like page for provisioning new agents with financial guardrails.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateAgentForm } from "@/components/dashboard/create-agent-form";

export default async function NewAgentPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login?redirect=/dashboard/agents/new");

    // Get Org
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) redirect("/dashboard?error=no_organization");

    // Fetch Clients
    const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", profile.default_organization_id)
        .eq("is_active", true)
        .order("name");

    const clients = clientsData || [];

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Back Link */}
                <Link
                    href="/dashboard/agents"
                    className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Abort Deployment
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Provision New Agent</h1>
                    <p className="text-white/40 mt-2">Configure identity, budget caps, and velocity limits.</p>
                </div>

                <CreateAgentForm clients={clients} />
            </div>
        </div>
    );
}
