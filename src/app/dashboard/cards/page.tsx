/**
 * CARDS MANAGEMENT PAGE
 * =============================================================================
 * Unified view of all issued virtual cards:
 * - List all cards
 * - Filter by status/client
 * - Quick actions (Freeze/Edit Limit)
 * - aggregated stats
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { CardsView } from "@/components/dashboard/cards/cards-view";

export const metadata: Metadata = {
    title: "Cards | Qoda",
    description: "Manage your virtual card fleet and spending controls.",
};

export default async function CardsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login?redirect=/dashboard/cards");

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) redirect("/dashboard?error=no_organization");

    // Fetch all agents with cards
    const { data: agents } = await supabase
        .from("agents")
        .select(`
            id,
            name,
            stripe_card_id,
            card_last_four,
            card_status,
            client:clients(name, id),
            daily_limit_cents,
            current_day_spend_cents
        `)
        .eq("organization_id", profile.default_organization_id)
        .not("stripe_card_id", "is", null);

    // Calc stats
    const activeCards = (agents || []).filter(a => a.card_status === 'active').length;
    const frozenCards = (agents || []).filter(a => a.card_status === 'inactive').length;
    const totalSpendToday = (agents || []).reduce((sum, a) => sum + (Number(a.current_day_spend_cents) || 0), 0);
    const totalLimit = (agents || []).reduce((sum, a) => sum + (Number(a.daily_limit_cents) || 0), 0);
    const utilization = totalLimit > 0 ? (totalSpendToday / totalLimit) * 100 : 0;

    return (
        <CardsView
            cards={(agents || []) as any}
            stats={{
                active: activeCards,
                frozen: frozenCards,
                utilization: Math.round(utilization),
                totalCards: (agents || []).length
            }}
        />
    );
}
