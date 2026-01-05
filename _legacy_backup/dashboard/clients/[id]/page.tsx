/**
 * Client Detail Page (Accountancy View)
 * =============================================================================
 * Financial health monitor for a specific client.
 * Visualizes Cost vs. Profit and manages billing terms.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ClientMonitor } from "@/components/dashboard/client-monitor";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const { id: clientId } = await params;
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/auth/login?redirect=/dashboard/clients/${clientId}`);

    // Get Org
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) redirect("/dashboard?error=no_organization");

    // Fetch Client
    const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .eq("organization_id", profile.default_organization_id)
        .single();

    if (error || !client) notFound();

    // Fetch Agents with Spend
    const { data: agents } = await supabase
        .from("agents")
        .select("id, name, is_active, current_spend_cents")
        .eq("client_id", clientId)
        .order("current_spend_cents", { ascending: false });

    // Transform types to match component
    const clientData = {
        id: client.id,
        name: client.name,
        contact_email: client.contact_email,
        created_at: client.created_at
    };

    const agentsData = (agents || []).map(a => ({
        id: a.id,
        name: a.name,
        is_active: a.is_active,
        current_spend_cents: BigInt(a.current_spend_cents)
    }));

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#050505] p-6">
            <Link
                href="/dashboard/clients"
                className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-white transition-colors mb-4 shrink-0"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Portfolio
            </Link>

            <div className="flex-1 min-h-0">
                <ClientMonitor client={clientData} agents={agentsData} />
            </div>
        </div>
    );
}
