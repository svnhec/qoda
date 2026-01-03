/**
 * GET /api/dashboard/stream
 * =============================================================================
 * Server-Sent Events (SSE) endpoint for real-time dashboard updates.
 * 
 * Streams:
 * - transactions: Live transaction feed
 * - velocity: Velocity updates
 * - agents: Agent status changes
 * =============================================================================
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) {
        return new Response("No organization", { status: 400 });
    }

    const organizationId = profile.default_organization_id;

    // Create SSE stream
    const encoder = new TextEncoder();
    let isStreaming = true;

    const stream = new ReadableStream({
        async start(controller) {
            // Send initial data
            const serviceClient = createServiceClient();

            // Get recent transactions
            const { data: recentTx } = await serviceClient
                .from("transaction_settlements")
                .select(`
                    id,
                    created_at,
                    amount_cents,
                    markup_fee_cents,
                    merchant_name,
                    merchant_category,
                    agents!inner (id, name, status)
                `)
                .eq("organization_id", organizationId)
                .order("created_at", { ascending: false })
                .limit(20);

            // Get agent stats
            const { data: agents } = await serviceClient
                .from("agents")
                .select(`
                    id,
                    name,
                    status,
                    current_spend_cents,
                    monthly_budget_cents,
                    current_velocity_cents_per_minute,
                    today_spend_cents
                `)
                .eq("organization_id", organizationId)
                .eq("is_active", true);

            // Calculate aggregate stats
            const totalVelocity = agents?.reduce(
                (sum, a) => sum + BigInt(a.current_velocity_cents_per_minute || 0),
                0n
            ) ?? 0n;

            const totalTodaySpend = agents?.reduce(
                (sum, a) => sum + BigInt(a.today_spend_cents || 0),
                0n
            ) ?? 0n;

            // Send initial snapshot event
            const initialData = {
                type: "snapshot",
                data: {
                    transactions: recentTx?.map(tx => ({
                        id: tx.id,
                        created_at: tx.created_at,
                        amount_cents: tx.amount_cents,
                        markup_fee_cents: tx.markup_fee_cents,
                        merchant_name: tx.merchant_name,
                        merchant_category: tx.merchant_category,
                        agent: tx.agents,
                    })) ?? [],
                    agents: agents?.map(a => ({
                        id: a.id,
                        name: a.name,
                        status: a.status,
                        spend_cents: a.current_spend_cents,
                        budget_cents: a.monthly_budget_cents,
                        velocity: a.current_velocity_cents_per_minute,
                    })) ?? [],
                    aggregate: {
                        velocity_cents_per_minute: totalVelocity.toString(),
                        today_spend_cents: totalTodaySpend.toString(),
                        active_agents: agents?.length ?? 0,
                    },
                },
            };

            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
            );

            // Poll for updates every 5 seconds
            // (In production, use Supabase Realtime or a proper pub/sub)
            let lastTxId = recentTx?.[0]?.id ?? null;

            const pollInterval = setInterval(async () => {
                if (!isStreaming) {
                    clearInterval(pollInterval);
                    return;
                }

                try {
                    // Check for new transactions
                    const { data: newTx } = await serviceClient
                        .from("transaction_settlements")
                        .select(`
                            id,
                            created_at,
                            amount_cents,
                            markup_fee_cents,
                            merchant_name,
                            merchant_category,
                            agents!inner (id, name, status)
                        `)
                        .eq("organization_id", organizationId)
                        .order("created_at", { ascending: false })
                        .limit(5);

                    // Find transactions newer than last seen
                    const newItems = newTx?.filter(tx =>
                        lastTxId ? tx.id !== lastTxId : false
                    ) ?? [];

                    if (newItems.length > 0 && newItems[0]) {
                        lastTxId = newItems[0].id;

                        for (const tx of newItems) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({
                                    type: "transaction",
                                    data: {
                                        id: tx.id,
                                        created_at: tx.created_at,
                                        amount_cents: tx.amount_cents,
                                        markup_fee_cents: tx.markup_fee_cents,
                                        merchant_name: tx.merchant_name,
                                        merchant_category: tx.merchant_category,
                                        agent: tx.agents,
                                    },
                                })}\n\n`)
                            );
                        }
                    }

                    // Send heartbeat to keep connection alive
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch (err) {
                    console.error("SSE poll error:", err);
                }
            }, 5000);

            // Cleanup on disconnect
            request.signal.addEventListener("abort", () => {
                isStreaming = false;
                clearInterval(pollInterval);
                controller.close();
            });
        },
        cancel() {
            isStreaming = false;
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
