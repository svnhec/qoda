/**
 * POST /api/cron/aggregate-daily-spend
 * =============================================================================
 * Next.js API route version of the daily aggregation cron.
 * Can be triggered by Vercel Cron, external scheduler, or manual invocation.
 *
 * This provides an alternative to the Supabase Edge Function for environments
 * where Next.js is the primary deployment target.
 *
 * Flow:
 * 1. Authenticate: Verify CRON_SECRET
 * 2. Query all unbilled settlements from yesterday
 * 3. Group by client_id and calculate totals
 * 4. Push to Stripe Usage Records
 * 5. Mark transactions as billed
 * 6. Log to audit_log
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { logAudit, logAuditError } from "@/lib/db/audit";
import { formatCentsAsDecimal } from "@/lib/types/currency";
import Stripe from "stripe";

// Environment variables
const CRON_SECRET = process.env.CRON_SECRET || "";
const ENABLE_BILLING = process.env.ENABLE_BILLING === "true";

/**
 * Result of billing a single client.
 */
interface ClientBillingResult {
    client_id: string;
    success: boolean;
    amount_cents: number;
    error?: string;
}

/**
 * POST handler for daily spend aggregation.
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const results: ClientBillingResult[] = [];
    let totalAmountCents = 0n;

    // -------------------------------------------------------------------------
    // STEP 1: Authenticate - Verify from trusted source
    // -------------------------------------------------------------------------
    const authHeader = request.headers.get("Authorization");
    const cronToken = authHeader?.replace("Bearer ", "");

    // Require CRON_SECRET in production
    if (!CRON_SECRET) {
        console.error("CRON_SECRET not configured - cron jobs disabled");
        return NextResponse.json({ error: "Cron jobs not configured" }, { status: 503 });
    }

    if (cronToken !== CRON_SECRET) {
        console.error("Unauthorized: Invalid cron secret");
        await logAuditError({
            action: "cron_aggregate_spend",
            resourceType: "cron",
            error: new Error("Invalid cron secret"),
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if billing is enabled
    if (!ENABLE_BILLING) {
        console.warn("Billing is disabled via ENABLE_BILLING flag");
        return NextResponse.json({
            success: true,
            message: "Billing disabled",
            clients_billed: 0,
            total_amount_cents: "0",
        });
    }

    try {
        console.warn("Starting daily spend aggregation...");

        const supabase = createServiceClient();
        const stripe = getStripeClient();

        // -------------------------------------------------------------------------
        // STEP 2: Query all unbilled settlements from yesterday
        // -------------------------------------------------------------------------
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0] ?? "";

        if (!yesterdayStr) {
            throw new Error("Failed to compute yesterday's date");
        }

        console.warn(`Querying unbilled settlements for: ${yesterdayStr}`);

        const { data: unbilledData, error: queryError } = await supabase.rpc(
            "get_unbilled_settlements",
            { p_before_date: yesterdayStr }
        );

        if (queryError) {
            console.error("Failed to query unbilled settlements:", queryError);
            throw new Error(`Query failed: ${queryError.message}`);
        }

        if (!unbilledData || unbilledData.length === 0) {
            console.warn("No unbilled settlements found for yesterday");
            await logAudit({
                action: "daily_spend_aggregation",
                resource_type: "billing",
                description: "No unbilled settlements found for yesterday",
                metadata: {
                    yesterday: yesterdayStr,
                    processing_time_ms: Date.now() - startTime,
                },
            });

            return NextResponse.json({
                success: true,
                clients_billed: 0,
                total_amount_cents: "0",
                message: "No unbilled settlements found",
            });
        }

        console.warn(`Found ${unbilledData.length} clients with unbilled settlements`);

        // -------------------------------------------------------------------------
        // STEP 3-6: Process each client
        // -------------------------------------------------------------------------
        for (const clientGroup of unbilledData as Array<{
            client_id: string;
            stripe_subscription_item_id: string;
            total_spend_cents: string;
            total_markup_cents: string;
            total_rebill_cents: string;
            transaction_count: number;
            settlement_ids: string[];
        }>) {
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

                const orgData = clientData?.organizations as { stripe_account_id?: string } | null;
                const stripeAccountId = orgData?.stripe_account_id;

                // -------------------------------------------------------------------------
                // STEP 5: Push to Stripe Usage Records
                // -------------------------------------------------------------------------
        // Units = total rebill in cents (1 unit = 1 cent)
        const units = BigInt(total_rebill_cents);

        console.warn(
            `Reporting ${units} units ($${formatCentsAsDecimal(units, 2)}) for client ${client_id}`
        );

                // Generate idempotency key to prevent duplicates
                const idempotencyKey = `aggregate_${client_id}_${yesterdayStr}`;

                const usageRecordParams: Stripe.SubscriptionItemCreateUsageRecordParams = {
                    quantity: Number(units),
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

                console.warn(`Successfully reported usage for client ${client_id}`);

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
                await logAudit({
                    action: "daily_spend_aggregation",
                    resource_type: "client",
                    resource_id: client_id,
                    organization_id: clientData?.organization_id ?? null,
                    description: `Aggregated $${formatCentsAsDecimal(units, 2)} for client, pushed to Stripe`,
                    metadata: {
                        total_spend_cents,
                        total_markup_cents,
                        total_rebill_cents,
                        transaction_count,
                        settlement_ids,
                        billing_period: billingPeriod,
                        stripe_subscription_item_id,
                    },
                });

                results.push({
                    client_id,
                    success: true,
                    amount_cents: Number(units),
                });

                totalAmountCents += units;
            } catch (clientError) {
                // -------------------------------------------------------------------------
                // STEP 8: On error - log and retry tomorrow
                // -------------------------------------------------------------------------
                const error = clientError instanceof Error ? clientError : new Error("Unknown error");
                console.error(`Failed to bill client ${client_id}:`, error.message);

                // Log error to audit_log
                await logAudit({
                    action: "daily_spend_aggregation_error",
                    resource_type: "client",
                    resource_id: client_id,
                    error_message: error.message,
                    description: `Failed to aggregate spend for client`,
                    metadata: {
                        total_rebill_cents,
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

        console.warn(
            `Daily aggregation complete: ${successCount} clients billed, ${failureCount} failed, ` +
            `$${formatCentsAsDecimal(totalAmountCents, 2)} total, ${processingTimeMs}ms`
        );

        // Log summary to audit_log
        await logAudit({
            action: "daily_spend_aggregation_summary",
            resource_type: "billing",
            description: `Daily aggregation complete: ${successCount} clients, $${formatCentsAsDecimal(totalAmountCents, 2)}`,
            metadata: {
                clients_billed: successCount,
                clients_failed: failureCount,
                total_amount_cents: totalAmountCents.toString(),
                processing_time_ms: processingTimeMs,
                date: yesterdayStr,
                results: results.map(r => ({ ...r, amount_cents: r.amount_cents.toString() })),
            },
        });

        return NextResponse.json({
            success: true,
            clients_billed: successCount,
            clients_failed: failureCount,
            total_amount_cents: totalAmountCents.toString(),
            processing_time_ms: processingTimeMs,
            results: results.map(r => ({ ...r, amount_cents: r.amount_cents.toString() })),
        });
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Daily aggregation failed:", error.message);

        // Log critical error
        await logAuditError({
            action: "daily_spend_aggregation",
            resourceType: "cron",
            error,
            metadata: {
                processing_time_ms: Date.now() - startTime,
                partial_results: results.length,
            },
        });

        return NextResponse.json(
            {
                success: false,
                error: error.message,
                clients_billed: results.filter((r) => r.success).length,
                total_amount_cents: totalAmountCents.toString(),
                processing_time_ms: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}
