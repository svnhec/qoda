/**
 * SWITCHBOARD BILLING ENGINE
 * =============================================================================
 * Metered billing setup and management for client rebilling.
 * 
 * Uses Stripe metered subscriptions to bill clients for agent spend + markup.
 * Each client gets:
 * - A Stripe Customer
 * - A metered Product (representing their usage)
 * - A metered Price ($0.01 per unit = 1 cent per cent)
 * - A Subscription with a single metered item
 * 
 * The daily aggregation cron reports usage to Stripe, which generates invoices.
 * 
 * Supports two billing modes:
 * 1. Platform billing (default): Platform bills clients directly
 * 2. Connected account billing: Agency bills clients via Stripe Connect (on_behalf_of)
 * =============================================================================
 */

import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";
import { logAuditError, logFinancialOperation } from "@/lib/db/audit";
import type { Client, Organization } from "@/lib/db/types";

/**
 * Result type for billing operations.
 */
export type BillingResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Metered billing setup result.
 */
export interface MeterBillingSetup {
    stripe_customer_id: string;
    stripe_product_id: string;
    stripe_price_id: string;
    stripe_subscription_id: string;
    stripe_subscription_item_id: string;
    on_behalf_of?: string; // Connected account ID if using Connect billing
    already_existed: boolean;
}

/**
 * Options for metered billing setup.
 */
export interface MeterBillingOptions {
    /**
     * If true, create billing on the connected account (agency bills client).
     * If false, create on platform account (platform bills client).
     * Default: false (platform billing)
     */
    useConnectedAccount?: boolean;
}

/**
 * Client with organization info for billing setup.
 */
export interface ClientForBilling extends Client {
    organization?: Pick<Organization, "id" | "name" | "stripe_account_id" | "stripe_account_verified_at">;
}

/**
 * Setup metered billing for a client.
 * 
 * This function is idempotent - if billing is already configured, it returns
 * the existing configuration.
 * 
 * Flow:
 * 1. Check if subscription exists → return existing
 * 2. Get/create Stripe Customer
 * 3. Create Stripe Product (unique per client)
 * 4. Create Stripe Price (metered, $0.01/unit = 1 cent)
 * 5. Create Stripe Subscription
 * 6. Store all IDs in clients table
 * 
 * @param clientId - Client UUID to set up billing for
 * @param options - Billing options (useConnectedAccount, etc.)
 * @returns Billing configuration or error
 * 
 * @example
 * ```typescript
 * // Platform billing (default)
 * const result = await setupMeterBillingForClient(clientId);
 * 
 * // Connected account billing (agency bills client)
 * const result = await setupMeterBillingForClient(clientId, { useConnectedAccount: true });
 * ```
 */
export async function setupMeterBillingForClient(
    clientId: string,
    options: MeterBillingOptions = {}
): Promise<BillingResult<MeterBillingSetup>> {
    const { useConnectedAccount = false } = options;

    try {
        const supabase = createServiceClient();
        const stripe = getStripeClient();

        // -------------------------------------------------------------------------
        // STEP 1: Get client and organization data
        // -------------------------------------------------------------------------
        const { data: client, error: clientError } = await supabase
            .from("clients")
            .select(`
        *,
        organizations!inner (
          id,
          name,
          stripe_account_id,
          stripe_account_verified_at
        )
      `)
            .eq("id", clientId)
            .single();

        if (clientError || !client) {
            return {
                success: false,
                error: `Client not found: ${clientId}`,
            };
        }

        const organization = client.organizations as unknown as Pick<
            Organization,
            "id" | "name" | "stripe_account_id" | "stripe_account_verified_at"
        >;

        // -------------------------------------------------------------------------
        // STEP 1.5: Validate connected account if using Connect billing
        // -------------------------------------------------------------------------
        let stripeAccountId: string | undefined;

        if (useConnectedAccount) {
            if (!organization.stripe_account_id) {
                return {
                    success: false,
                    error: "Organization does not have a connected Stripe account",
                };
            }
            if (!organization.stripe_account_verified_at) {
                return {
                    success: false,
                    error: "Organization's Stripe account is not verified",
                };
            }
            stripeAccountId = organization.stripe_account_id;
        }

        // -------------------------------------------------------------------------
        // STEP 2: Check if subscription already exists
        // -------------------------------------------------------------------------
        if (
            client.stripe_subscription_id &&
            client.stripe_subscription_item_id &&
            client.stripe_customer_id
        ) {
            // Verify subscription is still active in Stripe
            try {
                const subscription = await stripe.subscriptions.retrieve(
                    client.stripe_subscription_id,
                    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
                );

                if (subscription.status === "active" || subscription.status === "trialing") {
                    return {
                        success: true,
                        data: {
                            stripe_customer_id: client.stripe_customer_id,
                            stripe_product_id: client.stripe_product_id!,
                            stripe_price_id: client.stripe_price_id!,
                            stripe_subscription_id: client.stripe_subscription_id,
                            stripe_subscription_item_id: client.stripe_subscription_item_id,
                            on_behalf_of: stripeAccountId,
                            already_existed: true,
                        },
                    };
                }
                // If subscription is canceled/past_due, we'll create a new one below
            } catch {
                // Subscription doesn't exist in Stripe, create new one
            }
        }

        // -------------------------------------------------------------------------
        // STEP 3: Get or create Stripe Customer
        // -------------------------------------------------------------------------
        let customerId = client.stripe_customer_id;

        if (!customerId) {
            const customerParams: Stripe.CustomerCreateParams = {
                name: client.name,
                email: client.contact_email || undefined,
                metadata: {
                    switchboard_client_id: client.id,
                    switchboard_organization_id: organization.id,
                    organization_name: organization.name,
                    platform: "switchboard",
                },
            };

            const customer = stripeAccountId
                ? await stripe.customers.create(customerParams, { stripeAccount: stripeAccountId })
                : await stripe.customers.create(customerParams);

            customerId = customer.id;
        }

        // -------------------------------------------------------------------------
        // STEP 4: Create Stripe Product (or use existing)
        // -------------------------------------------------------------------------
        let productId = client.stripe_product_id;

        if (!productId) {
            const productParams: Stripe.ProductCreateParams = {
                name: `${client.name} - AI Agent Spend`,
                description: `Metered billing for AI agent usage by ${client.name}`,
                metadata: {
                    switchboard_client_id: client.id,
                    switchboard_organization_id: organization.id,
                    type: "metered_usage",
                    platform: "switchboard",
                },
            };

            const product = stripeAccountId
                ? await stripe.products.create(productParams, { stripeAccount: stripeAccountId })
                : await stripe.products.create(productParams);

            productId = product.id;
        }

        // -------------------------------------------------------------------------
        // STEP 5: Create Stripe Price (metered, $0.01 per unit)
        // -------------------------------------------------------------------------
        // Each unit = 1 cent, so reporting 100 units = $1.00
        let priceId = client.stripe_price_id;

        if (!priceId) {
            const priceParams: Stripe.PriceCreateParams = {
                product: productId,
                currency: "usd",
                // $0.01 per unit (1 cent per unit)
                // When we report usage, we report cents directly
                unit_amount: 1, // 1 cent per unit
                recurring: {
                    interval: "month",
                    usage_type: "metered",
                    aggregate_usage: "sum", // Sum all usage in the period
                },
                billing_scheme: "per_unit",
                metadata: {
                    switchboard_client_id: client.id,
                    type: "metered_agent_spend",
                    unit: "cents",
                    platform: "switchboard",
                },
            };

            const price = stripeAccountId
                ? await stripe.prices.create(priceParams, { stripeAccount: stripeAccountId })
                : await stripe.prices.create(priceParams);

            priceId = price.id;
        }

        // -------------------------------------------------------------------------
        // STEP 6: Create Stripe Subscription
        // -------------------------------------------------------------------------
        const subscriptionParams: Stripe.SubscriptionCreateParams = {
            customer: customerId,
            items: [
                {
                    price: priceId,
                },
            ],
            // Don't send invoice immediately - wait for usage
            payment_behavior: "default_incomplete",
            // Expand to get subscription item ID
            expand: ["items.data"],
            metadata: {
                switchboard_client_id: client.id,
                switchboard_organization_id: organization.id,
                type: "metered_billing",
                platform: "switchboard",
            },
        };

        const subscription = stripeAccountId
            ? await stripe.subscriptions.create(subscriptionParams, { stripeAccount: stripeAccountId })
            : await stripe.subscriptions.create(subscriptionParams);

        // Get the subscription item ID (needed for usage reporting)
        const subscriptionItemId = subscription.items.data[0]?.id;

        if (!subscriptionItemId) {
            return {
                success: false,
                error: "Failed to get subscription item ID",
            };
        }

        // -------------------------------------------------------------------------
        // STEP 7: Store IDs in clients table
        // -------------------------------------------------------------------------
        const { error: updateError } = await supabase
            .from("clients")
            .update({
                stripe_customer_id: customerId,
                stripe_product_id: productId,
                stripe_price_id: priceId,
                stripe_subscription_id: subscription.id,
                stripe_subscription_item_id: subscriptionItemId,
            })
            .eq("id", clientId);

        if (updateError) {
            // Log but don't fail - the Stripe resources are created
            await logAuditError({
                action: "setup_metered_billing",
                resourceType: "client",
                resourceId: clientId,
                organizationId: organization.id,
                error: updateError,
                metadata: {
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscription.id,
                    on_behalf_of: stripeAccountId,
                },
            });
        }

        // -------------------------------------------------------------------------
        // STEP 8: Log success
        // -------------------------------------------------------------------------
        await logFinancialOperation({
            action: "setup_metered_billing",
            resourceType: "client",
            resourceId: clientId,
            organizationId: organization.id,
            stateAfter: {
                stripe_customer_id: customerId,
                stripe_product_id: productId,
                stripe_price_id: priceId,
                stripe_subscription_id: subscription.id,
                stripe_subscription_item_id: subscriptionItemId,
                on_behalf_of: stripeAccountId,
                billing_mode: stripeAccountId ? "connected_account" : "platform",
            },
            reason: `Metered billing setup for client: ${client.name}`,
        });

        return {
            success: true,
            data: {
                stripe_customer_id: customerId,
                stripe_product_id: productId,
                stripe_price_id: priceId,
                stripe_subscription_id: subscription.id,
                stripe_subscription_item_id: subscriptionItemId,
                on_behalf_of: stripeAccountId,
                already_existed: false,
            },
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Metered billing setup failed:", error);

        await logAuditError({
            action: "setup_metered_billing",
            resourceType: "client",
            resourceId: clientId,
            error,
        });

        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Report usage to Stripe for a client's metered subscription.
 * 
 * This is called by the daily aggregation cron to report agent spend.
 * 
 * @param subscriptionItemId - Stripe subscription item ID
 * @param quantity - Usage quantity in cents (1 unit = 1 cent)
 * @param options - Optional: timestamp, idempotencyKey, stripeAccountId
 * @returns Usage record or error
 */
export async function reportUsage(
    subscriptionItemId: string,
    quantity: number,
    options: {
        timestamp?: number;
        idempotencyKey?: string;
        stripeAccountId?: string;
    } = {}
): Promise<BillingResult<Stripe.UsageRecord>> {
    const { timestamp, idempotencyKey, stripeAccountId } = options;

    try {
        const stripe = getStripeClient();

        const usageRecordParams: Stripe.SubscriptionItemCreateUsageRecordParams = {
            quantity,
            timestamp: timestamp || Math.floor(Date.now() / 1000),
            action: "increment", // Add to existing usage
        };

        const requestOptions: Stripe.RequestOptions = {};
        if (idempotencyKey) {
            requestOptions.idempotencyKey = idempotencyKey;
        }
        if (stripeAccountId) {
            requestOptions.stripeAccount = stripeAccountId;
        }

        const usageRecord = await stripe.subscriptionItems.createUsageRecord(
            subscriptionItemId,
            usageRecordParams,
            requestOptions
        );

        return {
            success: true,
            data: usageRecord,
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Usage reporting failed:", error);

        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Get a client's current billing status.
 * 
 * @param clientId - Client UUID
 * @param stripeAccountId - Optional connected account ID
 * @returns Billing status or error
 */
export async function getClientBillingStatus(
    clientId: string,
    stripeAccountId?: string
): Promise<BillingResult<{
    has_billing: boolean;
    subscription_status?: Stripe.Subscription.Status;
    current_period_start?: Date;
    current_period_end?: Date;
    usage_this_period?: number;
}>> {
    try {
        const supabase = createServiceClient();
        const stripe = getStripeClient();

        const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("stripe_subscription_id, stripe_subscription_item_id")
            .eq("id", clientId)
            .single();

        if (clientError || !client) {
            return {
                success: false,
                error: `Client not found: ${clientId}`,
            };
        }

        if (!client.stripe_subscription_id) {
            return {
                success: true,
                data: { has_billing: false },
            };
        }

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(
            client.stripe_subscription_id,
            stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
        );

        // Get usage for current period
        let usageThisPeriod = 0;
        if (client.stripe_subscription_item_id) {
            const usageSummary = await stripe.subscriptionItems.listUsageRecordSummaries(
                client.stripe_subscription_item_id,
                { limit: 1 },
                stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
            );
            usageThisPeriod = usageSummary.data[0]?.total_usage || 0;
        }

        return {
            success: true,
            data: {
                has_billing: true,
                subscription_status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000),
                current_period_end: new Date(subscription.current_period_end * 1000),
                usage_this_period: usageThisPeriod,
            },
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Cancel a client's metered billing subscription.
 * 
 * @param clientId - Client UUID
 * @param options - Optional: immediately, stripeAccountId
 * @returns Success or error
 */
export async function cancelClientBilling(
    clientId: string,
    options: {
        immediately?: boolean;
        stripeAccountId?: string;
    } = {}
): Promise<BillingResult<{ canceled_at: Date }>> {
    const { immediately = false, stripeAccountId } = options;

    try {
        const supabase = createServiceClient();
        const stripe = getStripeClient();

        const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("stripe_subscription_id, name")
            .eq("id", clientId)
            .single();

        if (clientError || !client) {
            return {
                success: false,
                error: `Client not found: ${clientId}`,
            };
        }

        if (!client.stripe_subscription_id) {
            return {
                success: false,
                error: "Client has no active subscription",
            };
        }

        let subscription: Stripe.Subscription;
        const stripeOptions = stripeAccountId ? { stripeAccount: stripeAccountId } : undefined;

        if (immediately) {
            subscription = await stripe.subscriptions.cancel(
                client.stripe_subscription_id,
                undefined,
                stripeOptions
            );
        } else {
            subscription = await stripe.subscriptions.update(
                client.stripe_subscription_id,
                { cancel_at_period_end: true },
                stripeOptions
            );
        }

        // Clear subscription IDs if canceled immediately
        if (immediately) {
            await supabase
                .from("clients")
                .update({
                    stripe_subscription_id: null,
                    stripe_subscription_item_id: null,
                })
                .eq("id", clientId);
        }

        await logFinancialOperation({
            action: "cancel_client_billing",
            resourceType: "client",
            resourceId: clientId,
            stateAfter: {
                subscription_status: subscription.status,
                cancel_at_period_end: subscription.cancel_at_period_end,
                canceled_immediately: immediately,
            },
            reason: `Billing canceled for client: ${client.name}`,
        });

        return {
            success: true,
            data: {
                canceled_at: subscription.canceled_at
                    ? new Date(subscription.canceled_at * 1000)
                    : new Date(),
            },
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Cancel billing failed:", error);

        return {
            success: false,
            error: error.message,
        };
    }
}
