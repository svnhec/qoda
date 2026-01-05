/**
 * Create New Client Page (Onboarding Wizard)
 * =============================================================================
 * Multi-step onboarding for new clients.
 * Handles Identity, Billing Method, and Commercial Terms.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateClientWizard } from "@/components/dashboard/create-client-wizard";

export default async function NewClientPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login?redirect=/dashboard/clients/new");

    // Get Org Check
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) redirect("/dashboard?error=no_organization");

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 via-[#050505] to-[#050505]">
            <div className="w-full max-w-2xl">
                {/* Back Link */}
                <Link
                    href="/dashboard/clients"
                    className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Portfolio
                </Link>

                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Onboard New Client</h1>
                    <p className="text-white/40">Set up billing, payment methods, and margin configurations.</p>
                </div>

                <CreateClientWizard />
            </div>
        </div>
    );
}
