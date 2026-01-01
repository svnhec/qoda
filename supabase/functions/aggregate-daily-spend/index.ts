/**
 * SWITCHBOARD DAILY AGGREGATION CRON
 * =============================================================================
 * Supabase Edge Function that runs nightly to aggregate transaction spend
 * and push to Stripe Usage Records for metered billing.
 *
 * Endpoint: POST /functions/v1/aggregate-daily-spend
 *
 * Flow:
 * 1. Authenticate: Verify from trusted source (secret token)
 * 2. Query all transactions settled yesterday NOT billed yet
 * 3. Group by client_id and calculate totals
 * 4. Push to Stripe Usage Records
 * 5. Mark transactions as billed
 * 6. Log to audit_log
 *
 * Trigger: pg_cron or HTTP trigger from external scheduler
 * =============================================================================
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.14.0";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

/**
 * Unbilled settlement grouped by client.
 */
interface ClientSettlementGroup {
    client_id: string;
    stripe_subscription_item_id: string;
    stripe_account_id: string | null;
    total_spend_cents: bigint;
    total_markup_cents: bigint;
    total_rebill_cents: bigint;
    transaction_count: number;
    settlement_ids: string[];
}

/**
 * Result of billing a single client.
 */
interface ClientBillingResult {
    client_id: string;
    success: boolean;
    amount_cents: number;
    error?: string;
}

serve(async (req: Request) => {
    // -------------------------------------------------------------------------
    // STEP 1: Authenticate - Verify from trusted source
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    const cronToken = authHeader?.replace("Bearer ", "");

    // Allow authenticated requests or internal pg_cron calls
    if (CRON_SECRET && cronToken !== CRON_SECRET) {
        console.error("Unauthorized: Invalid cron secret");
        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    const startTime = Date.now();
    const results: ClientBillingResult[] = [];
    let totalAmountCents = 0;

    try {
        console.log("Starting daily spend aggregation...");

        // -------------------------------------------------------------------------
        // STEP 2: Query all unbilled settlements from yesterday
        // -------------------------------------------------------------------------
        // Use the database function to get unbilled settlements grouped by client
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        console.log(`Querying unbilled settlements for: ${yesterdayStr}`);

        const { data: unbilledData, error: queryError } = await supabase.rpc(
            "get_unbilled_settlements",
            { p_before_date: yesterdayStr }
        );

        if (queryError) {
            console.error("Failed to query unbilled settlements:", queryError);
            throw new Error(`Query failed: ${queryError.message}`);
        }

        if (!unbilledData || unbilledData.length === 0) {
            console.log("No unbilled settlements found for yesterday");
            return new Response(
                JSON.stringify({
                    success: true,
                    clients_billed: 0,
                    total_amount_cents: 0,
                    message: "No unbilled settlements found",
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`Found ${unbilledData.length} clients with unbilled settlements`);

        // -------------------------------------------------------------------------
        // STEP 3-6: Process each client
        // -------------------------------------------------------------------------
        for (const clientGroup of unbilledData) {
            const {
                client_id,
                stripe_subscription_item_id,
                total_spend_cents,
                total_markup_cents,
                total_rebill_cents,
                transaction_count,
                settlement_ids,
            } = clientGroup;

            if (!stripe_subscription_item_id) {
                console.warn(`Client ${client_id} has no subscription item, skipping`);
                results.push({
                    client_id,
                    success: false,
                    amount_cents: 0,
                    error: "No subscription item configured",
                });
                continue;
            }

            try {
                // -------------------------------------------------------------------------
                // STEP 4: Get organization's Stripe account (for Connect billing)
                // -------------------------------------------------------------------------
                const { data: clientData } = await supabase
                    .from("clients")
                    .select(`
            organization_id,
            organizations!inner (
              stripe_account_id
            )
          `)
                    .eq("id", client_id)
                    .single();

                const stripeAccountId = (clientData?.organizations as { stripe_account_id?: string })?.stripe_account_id;

                // -------------------------------------------------------------------------
                // STEP 5: Push to Stripe Usage Records
                // -------------------------------------------------------------------------
                // Units = total rebill in cents (1 unit = 1 cent)
                const units = Number(total_rebill_cents);

                console.log(
                    `Reporting ${units} units ($${(units / 100).toFixed(2)}) for client ${client_id}`
                );

                // Generate idempotency key to prevent duplicates
                const idempotencyKey = `aggregate_${client_id}_${yesterdayStr}`;

                const usageRecordParams: Stripe.SubscriptionItemCreateUsageRecordParams = {
                    quantity: units,
                    timestamp: Math.floor(Date.now() / 1000),
                    action: "increment",
                };

                const requestOptions: Stripe.RequestOptions = {
                    idempotencyKey,
                };

                // Use connected account if available
                if (stripeAccountId) {
                    requestOptions.stripeAccount = stripeAccountId;
                }

                await stripe.subscriptionItems.createUsageRecord(
                    stripe_subscription_item_id,
                    usageRecordParams,
                    requestOptions
                );

                console.log(`Successfully reported usage for client ${client_id}`);

                // -------------------------------------------------------------------------
                // STEP 6: Mark transactions as billed
                // -------------------------------------------------------------------------
                const billingPeriod = yesterdayStr.substring(0, 7); // YYYY-MM

                const { error: updateError } = await supabase.rpc(
                    "mark_settlements_billed",
                    {
                        p_settlement_ids: settlement_ids,
                        p_billing_period: billingPeriod,
                    }
                );

                if (updateError) {
                    console.error(`Failed to mark settlements as billed for client ${client_id}:`, updateError);
                    // Don't throw - the usage record was created successfully
                }

                // -------------------------------------------------------------------------
                // STEP 7: Log to audit_log
                // -------------------------------------------------------------------------
                await supabase.from("audit_log").insert({
                    action: "daily_spend_aggregation",
                    resource_type: "client",
                    resource_id: client_id,
                    organization_id: clientData?.organization_id,
                    description: `Aggregated $${(units / 100).toFixed(2)} for client, pushed to Stripe`,
                    metadata: {
                        total_spend_cents: total_spend_cents.toString(),
                        total_markup_cents: total_markup_cents.toString(),
                        total_rebill_cents: total_rebill_cents.toString(),
                        transaction_count,
                        settlement_ids,
                        billing_period: billingPeriod,
                        stripe_subscription_item_id,
                    },
                });

                results.push({
                    client_id,
                    success: true,
                    amount_cents: units,
                });

                totalAmountCents += units;
            } catch (clientError) {
                // -------------------------------------------------------------------------
                // STEP 8: On error - log and retry tomorrow
                // -------------------------------------------------------------------------
                const error = clientError instanceof Error ? clientError : new Error("Unknown error");
                console.error(`Failed to bill client ${client_id}:`, error.message);

                // Log error to audit_log
                await supabase.from("audit_log").insert({
                    action: "daily_spend_aggregation_error",
                    resource_type: "client",
                    resource_id: client_id,
                    error_message: error.message,
                    description: `Failed to aggregate spend for client`,
                    metadata: {
                        total_rebill_cents: total_rebill_cents?.toString(),
                        transaction_count,
                        will_retry: true,
                    },
                });

                results.push({
                    client_id,
                    success: false,
                    amount_cents: 0,
                    error: error.message,
                });
            }
        }

        // -------------------------------------------------------------------------
        // STEP 9: Return results
        // -------------------------------------------------------------------------
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;
        const processingTimeMs = Date.now() - startTime;

        console.log(
            `Daily aggregation complete: ${successCount} clients billed, ${failureCount} failed, ` +
            `$${(totalAmountCents / 100).toFixed(2)} total, ${processingTimeMs}ms`
        );

        // Log summary to audit_log
        await supabase.from("audit_log").insert({
            action: "daily_spend_aggregation_summary",
            resource_type: "system",
            description: `Daily aggregation complete: ${successCount} clients, $${(totalAmountCents / 100).toFixed(2)}`,
            metadata: {
                clients_billed: successCount,
                clients_failed: failureCount,
                total_amount_cents: totalAmountCents,
                processing_time_ms: processingTimeMs,
                date: yesterdayStr,
            },
        });

        return new Response(
            JSON.stringify({
                success: true,
                clients_billed: successCount,
                clients_failed: failureCount,
                total_amount_cents: totalAmountCents,
                processing_time_ms: processingTimeMs,
                results,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Daily aggregation failed:", error.message);

        // Log critical error
        await supabase.from("audit_log").insert({
            action: "daily_spend_aggregation_critical_error",
            resource_type: "system",
            error_message: error.message,
            description: "Daily aggregation cron failed critically",
            metadata: {
                processing_time_ms: Date.now() - startTime,
            },
        });

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                clients_billed: results.filter((r) => r.success).length,
                total_amount_cents: totalAmountCents,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
