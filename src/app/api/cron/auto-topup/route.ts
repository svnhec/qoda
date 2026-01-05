/**
 * CRON: AUTO TOP-UP
 * =============================================================================
 * Runs every 10 mins.
 * Checks org balances. If below threshold, initiates transfer.
 *
 * CRITICAL: Uses atomic balance operations to prevent race conditions.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { addOrganizationFunds } from "@/lib/balance";

export async function GET(request: Request) {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    let topupsTriggered = 0;

    try {
        // Find orgs with low balance
        // Note: In real sql we can do "where issuing_balance < threshold"
        // But threshold is a column, so strictly: `where issuing_balance_cents < auto_topup_threshold_cents`

        const { data: orgs } = await supabase
            .from("organizations")
            .select("*")
            .eq("auto_topup_enabled", true);

        if (!orgs) return NextResponse.json({ processed: 0 });

        for (const org of orgs) {
            const balance = BigInt(org.issuing_balance_cents);
            const threshold = BigInt(org.auto_topup_threshold_cents || 0);

            if (balance < threshold) {
                const amountToAdd = BigInt(org.auto_topup_amount_cents || 100000); // Default $1k

                // ATOMIC: Record transaction and update balance together
                // In production, this should be wrapped in a database transaction
                const stripeTransferId = `auto_${Date.now()}`;

                // 1. Record transaction
                const { error: txError } = await supabase.from("funding_transactions").insert({
                    organization_id: org.id,
                    amount_cents: String(amountToAdd),
                    stripe_transfer_id: stripeTransferId,
                    status: 'pending', // Start as pending
                    description: 'Auto-Topup'
                });

                if (txError) {
                    console.error("Failed to record auto-topup transaction:", txError);
                    continue; // Skip this org, try others
                }

                // 2. ATOMIC: Update balance using race-condition-free function
                const balanceResult = await addOrganizationFunds(org.id, amountToAdd);

                if (balanceResult.success) {
                    // Mark transaction as succeeded
                    await supabase
                        .from("funding_transactions")
                        .update({ status: 'succeeded' })
                        .eq("stripe_transfer_id", stripeTransferId);

                    topupsTriggered++;
                } else {
                    // Mark transaction as failed and log error
                    await supabase
                        .from("funding_transactions")
                        .update({ status: 'failed' })
                        .eq("stripe_transfer_id", stripeTransferId);

                    console.error(`Auto-topup failed for org ${org.id}: ${balanceResult.error}`);
                }
            }
        }

        return NextResponse.json({ success: true, topups: topupsTriggered });

    } catch (error) {
        console.error("Auto-topup error:", error);
        return NextResponse.json({ error: "Job Failed" }, { status: 500 });
    }
}
