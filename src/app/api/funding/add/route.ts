/**
 * ADD FUNDING API
 * =============================================================================
 * Handles Manual Top-ups for Issuing Balance.
 *
 * CRITICAL: Uses atomic balance operations to prevent race conditions.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addOrganizationFunds } from "@/lib/balance";
import { z } from "zod";

const ENABLE_STRIPE_ISSUING = process.env.ENABLE_STRIPE_ISSUING === 'true';

// Zod schema for input validation
const AddFundingSchema = z.object({
  amount_cents: z.number()
    .int({ message: "Amount must be a whole number" })
    .positive({ message: "Amount must be positive" })
    .min(100, { message: "Minimum amount is $1.00" })
    .max(10000000, { message: "Maximum amount is $100,000.00" }),
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Parse and validate input
        const body = await request.json();
        const validation = AddFundingSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Invalid input",
                details: validation.error.errors
            }, { status: 400 });
        }

        const { amount_cents } = validation.data;

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

        // Record Transaction (this should be atomic with balance update in production)
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

        // ATOMIC: Update Org Balance using race-condition-free function
        if (!ENABLE_STRIPE_ISSUING) {
            const balanceResult = await addOrganizationFunds(
                profile.default_organization_id,
                BigInt(amount_cents)
            );

            if (!balanceResult.success) {
                // Rollback transaction record (this is imperfect, but better than corrupted balance)
                await supabase
                    .from("funding_transactions")
                    .update({ status: 'failed' })
                    .eq("stripe_transfer_id", stripeTransferId);

                return NextResponse.json({
                    error: `Balance update failed: ${balanceResult.error}`
                }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Funding error:", error);
        return NextResponse.json({ error: "Funding Failed" }, { status: 500 });
    }
}
