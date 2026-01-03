/**
 * CRON: GENERATE INVOICES
 * =============================================================================
 * Runs monthly.
 * 1. Identifies all uninvoiced transactions for the previous month.
 * 2. Groups them by Client.
 * 3. Creates Draft Invoices.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service Role Client (for background worker)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow local dev testing
        if (process.env.NODE_ENV !== 'development') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        // 1. Get all active clients
        const { data: clients } = await supabase
            .from("clients")
            .select("id, organization_id, markup_percentage")
            .eq("is_active", true);

        if (!clients) return NextResponse.json({ processed: 0 });

        let createdCount = 0;

        // 2. For each client, check for uninvoiced transactions
        for (const client of clients) {
            // Logic: Find settled transactions not linked to an invoice
            // Simple approach: Look for null invoice_id (assuming we added that column, or join check)
            // For MVP, we'll query by raw date range of "Last Month"

            const now = new Date();
            const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

            // Check if invoice already exists for this period
            const { data: existing } = await supabase
                .from("invoices")
                .select("id")
                .eq("client_id", client.id)
                .eq("period_start", firstDayLastMonth.toISOString())
                .single();

            if (existing) continue; // Already generated

            // Sum transactions
            const { data: txns } = await supabase
                .from("transaction_settlements")
                .select("amount_cents")
                .eq("client_id", client.id)
                .gte("created_at", firstDayLastMonth.toISOString())
                .lte("created_at", lastDayLastMonth.toISOString());

            if (!txns || txns.length === 0) continue;

            const subtotal = txns.reduce((sum, t) => sum + BigInt(t.amount_cents), 0n);
            if (subtotal === 0n) continue;

            const markup = (subtotal * BigInt(Math.round(client.markup_percentage))) / 100n;
            const total = subtotal + markup;

            // Create Invoice
            await supabase.from("invoices").insert({
                organization_id: client.organization_id,
                client_id: client.id,
                period_start: firstDayLastMonth.toISOString(),
                period_end: lastDayLastMonth.toISOString(),
                subtotal_cents: String(subtotal),
                markup_cents: String(markup),
                total_cents: String(total),
                status: 'draft'
            });

            createdCount++;
        }

        return NextResponse.json({ success: true, generated: createdCount });

    } catch (error) {
        console.error("Invoice gen error:", error);
        return NextResponse.json({ error: "Job Failed" }, { status: 500 });
    }
}
