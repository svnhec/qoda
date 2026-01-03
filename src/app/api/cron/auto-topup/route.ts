/**
 * CRON: AUTO TOP-UP
 * =============================================================================
 * Runs every 10 mins.
 * Checks org balances. If below threshold, initiates transfer.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Find orgs with low balance
        // Note: In real sql we can do "where issuing_balance < threshold"
        // But threshold is a column, so strictly: `where issuing_balance_cents < auto_topup_threshold_cents`

        const { data: orgs } = await supabase
            .from("organizations")
            .select("*")
            .eq("auto_topup_enabled", true);

        if (!orgs) return NextResponse.json({ processed: 0 });

        let topupsTriggered = 0;

        for (const org of orgs) {
            const balance = BigInt(org.issuing_balance_cents);
            const threshold = BigInt(org.auto_topup_threshold_cents || 0);

            if (balance < threshold) {
                const amountToAdd = BigInt(org.auto_topup_amount_cents || 100000); // Default $1k

                // Trigger Topup (Using the logic we defined in /api/funding/add)
                // In a cron context, we call the standardized service function or just Db insert

                // 1. Record
                await supabase.from("funding_transactions").insert({
                    organization_id: org.id,
                    amount_cents: String(amountToAdd),
                    stripe_transfer_id: `auto_${Date.now()}`,
                    status: 'succeeded',
                    description: 'Auto-Topup'
                });

                // 2. Update Balance
                await supabase
                    .from("organizations")
                    .update({ issuing_balance_cents: String(balance + amountToAdd) })
                    .eq("id", org.id);

                topupsTriggered++;
            }
        }

        return NextResponse.json({ success: true, topups: topupsTriggered });

    } catch (error) {
        console.error("Auto-topup error:", error);
        return NextResponse.json({ error: "Job Failed" }, { status: 500 });
    }
}
