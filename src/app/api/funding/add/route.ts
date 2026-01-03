/**
 * ADD FUNDING API
 * =============================================================================
 * Handles Manual Top-ups for Issuing Balance.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ENABLE_STRIPE_ISSUING = process.env.ENABLE_STRIPE_ISSUING === 'true';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { amount_cents } = await request.json();

        if (!amount_cents || amount_cents < 100) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            return NextResponse.json({ error: "No organization" }, { status: 400 });
        }

        const stripeTransferId = `mock_tr_${Date.now()}`;

        // REAL STRIPE LOGIC
        if (ENABLE_STRIPE_ISSUING) {
            // In a real app, this would use stripe.topups.create
            // const { createTopUp } = await import("@/lib/issuing");
            // stripeTransferId = await createTopUp(amount_cents);
        }

        // Record Transaction
        const { error: txtError } = await supabase
            .from("funding_transactions")
            .insert({
                organization_id: profile.default_organization_id,
                amount_cents: String(amount_cents), // Positive for adding funds
                stripe_transfer_id: stripeTransferId,
                status: 'succeeded',
                description: 'Manual Top-up'
            });

        if (txtError) throw txtError;

        // Update Org Balance (in real Stripe world webhook does this, but for mock we do it manually)
        if (!ENABLE_STRIPE_ISSUING) {
            // Fetch current balance to increment
            // Note: in high concurrency utilize rpc increment, but simplistic read-write is fine for MVP
            const { data: org } = await supabase
                .from("organizations")
                .select('issuing_balance_cents')
                .eq('id', profile.default_organization_id)
                .single();

            const current = BigInt(org?.issuing_balance_cents || 0);
            const added = BigInt(amount_cents);

            await supabase
                .from("organizations")
                .update({ issuing_balance_cents: String(current + added) })
                .eq("id", profile.default_organization_id);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Funding error:", error);
        return NextResponse.json({ error: "Funding Failed" }, { status: 500 });
    }
}
