/**
 * SWITCHBOARD STRIPE CLIENT
 * =============================================================================
 * Stripe SDK initialization and helper functions for:
 * - Connected Accounts (Stripe Connect)
 * - Virtual Card Issuing
 * - Account Links (onboarding)
 * =============================================================================
 */

import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { logAuditError } from "@/lib/db/audit";

/**
 * Initialize Stripe SDK with secret key.
 * Uses the latest API version for new features.
 */
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    appInfo: {
      name: "Switchboard",
      version: "0.1.0",
      url: "https://switchboard.dev",
    },
  });
}

/**
 * Get the Stripe Connected Account ID for an organization.
 * 
 * @param organizationId - Organization UUID
 * @returns Stripe account ID
 * @throws Error if organization not found or account not linked
 * 
 * @example
 * ```typescript
 * const accountId = await getConnectedAccountId(orgId);
 * ```
 */
export async function getConnectedAccountId(
  organizationId: string
): Promise<string> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", organizationId)
      .single();

    if (error) {
      throw new Error(`Organization not found: ${error.message}`);
    }

    if (!data.stripe_account_id) {
      throw new Error(
        `Organization ${organizationId} does not have a Stripe account linked. Complete onboarding first.`
      );
    }

    return data.stripe_account_id;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "get_connected_account_id",
      resourceType: "organization",
      resourceId: organizationId,
      error,
    });
    throw error;
  }
}

/**
 * Create a Stripe Connected Account for an organization.
 * This initiates the Stripe Connect onboarding flow.
 * 
 * @param businessProfileData - Business information for the account
 * @returns Stripe Account object
 * 
 * @example
 * ```typescript
 * const account = await createConnectedAccount({
 *   email: "agency@example.com",
 *   country: "US",
 *   type: "express",
 *   business_type: "company",
 *   company: {
 *     name: "AI Automation Agency",
 *   },
 * });
 * ```
 */
export async function createConnectedAccount(
  businessProfileData: Stripe.AccountCreateParams
): Promise<Stripe.Account> {
  try {
    const stripe = getStripeClient();

    const account = await stripe.accounts.create(businessProfileData);

    return account;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "create_connected_account",
      resourceType: "stripe_account",
      error,
      metadata: {
        business_type: businessProfileData.business_type,
        country: businessProfileData.country,
      },
    });
    throw error;
  }
}

/**
 * Create an Account Link for Stripe Connect onboarding or updating.
 * Returns a URL that the user must visit to complete the flow.
 * 
 * @param accountId - Stripe Connected Account ID
 * @param type - Link type: 'account_onboarding' or 'account_update'
 * @param returnUrl - URL to redirect after completion
 * @param refreshUrl - URL to redirect if link expires
 * @returns Account Link with URL
 * 
 * @example
 * ```typescript
 * const link = await getAccountLink(
 *   accountId,
 *   "account_onboarding",
 *   "https://app.switchboard.dev/dashboard/settings",
 *   "https://app.switchboard.dev/dashboard/settings"
 * );
 * // Redirect user to link.url
 * ```
 */
export async function getAccountLink(
  accountId: string,
  type: "account_onboarding" | "account_update",
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string }> {
  try {
    const stripe = getStripeClient();

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type,
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    return { url: accountLink.url };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "create_account_link",
      resourceType: "stripe_account",
      resourceId: accountId,
      error,
      metadata: { link_type: type },
    });
    throw error;
  }
}

/**
 * Create a virtual card for an agent/project.
 * Uses Stripe Issuing to create a card linked to the organization's account.
 * 
 * CRITICAL: Amounts are in cents as BigInt. Never use number/float.
 * 
 * @param accountId - Stripe Connected Account ID (organization)
 * @param agentName - Name/identifier for the agent (e.g., "CustomerSupportBot")
 * @param spendLimitCents - Monthly spending limit in cents (BigInt)
 * @param metadata - Additional metadata (client_id, project_id, etc.)
 * @returns Stripe Card object
 * 
 * @example
 * ```typescript
 * const card = await createVirtualCard(
 *   accountId,
 *   "CustomerSupportBot",
 *   50000n,  // $500.00 monthly limit
 *   { client_id: "client_123", project_id: "proj_456" }
 * );
 * ```
 */
export async function createVirtualCard(
  accountId: string,
  agentName: string,
  spendLimitCents: bigint,
  metadata?: Record<string, string>
): Promise<Stripe.Issuing.Card> {
  try {
    const stripe = getStripeClient();

    // Validate amount
    if (spendLimitCents <= 0n) {
      throw new Error("Spend limit must be positive");
    }

    // Convert BigInt to number for Stripe API (they accept number)
    // This is safe because we're converting cents, not dollars
    const spendLimitNumber = Number(spendLimitCents);

    if (spendLimitNumber > Number.MAX_SAFE_INTEGER) {
      throw new Error("Spend limit exceeds safe integer range");
    }

    // Create cardholder first (required for Issuing)
    const cardholder = await stripe.issuing.cardholders.create({
      name: agentName,
      type: "individual",
      email: metadata?.email,
      phone_number: metadata?.phone,
      status: "active",
      billing: {
        address: {
          line1: metadata?.address_line1 || "N/A",
          city: metadata?.city || "N/A",
          state: metadata?.state || "N/A",
          postal_code: metadata?.postal_code || "00000",
          country: metadata?.country || "US",
        },
      },
      metadata: {
        ...metadata,
        agent_name: agentName,
        created_by: "switchboard",
      },
    });

    // Create the virtual card
    const card = await stripe.issuing.cards.create({
      cardholder: cardholder.id,
      currency: "usd",
      type: "virtual",
      status: "active",
      spending_controls: {
        spending_limits: [
          {
            amount: spendLimitNumber,
            interval: "monthly",
          },
        ],
        allowed_categories: metadata?.allowed_categories
          ? (metadata.allowed_categories.split(",") as Stripe.Issuing.CardCreateParams.SpendingControls.AllowedCategory[])
          : undefined,
        blocked_categories: metadata?.blocked_categories
          ? (metadata.blocked_categories.split(",") as Stripe.Issuing.CardCreateParams.SpendingControls.BlockedCategory[])
          : undefined,
      },
      metadata: {
        ...metadata,
        agent_name: agentName,
        spend_limit_cents: spendLimitCents.toString(),
        created_by: "switchboard",
      },
    });

    return card;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "create_virtual_card",
      resourceType: "stripe_card",
      error,
      metadata: {
        account_id: accountId,
        agent_name: agentName,
        spend_limit_cents: spendLimitCents.toString(),
      },
    });
    throw error;
  }
}

/**
 * Get a virtual card by ID.
 * 
 * @param cardId - Stripe Card ID
 * @returns Card object
 */
export async function getVirtualCard(
  cardId: string
): Promise<Stripe.Issuing.Card> {
  try {
    const stripe = getStripeClient();

    const card = await stripe.issuing.cards.retrieve(cardId);

    return card;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "get_virtual_card",
      resourceType: "stripe_card",
      resourceId: cardId,
      error,
    });
    throw error;
  }
}

/**
 * Update a virtual card's spending limits.
 * 
 * @param cardId - Stripe Card ID
 * @param spendLimitCents - New monthly limit in cents (BigInt)
 * @returns Updated Card object
 */
export async function updateVirtualCardLimit(
  cardId: string,
  spendLimitCents: bigint
): Promise<Stripe.Issuing.Card> {
  try {
    const stripe = getStripeClient();

    const spendLimitNumber = Number(spendLimitCents);

    if (spendLimitNumber > Number.MAX_SAFE_INTEGER) {
      throw new Error("Spend limit exceeds safe integer range");
    }

    const card = await stripe.issuing.cards.update(cardId, {
      spending_controls: {
        spending_limits: [
          {
            amount: spendLimitNumber,
            interval: "monthly",
          },
        ],
      },
    });

    return card;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "update_virtual_card_limit",
      resourceType: "stripe_card",
      resourceId: cardId,
      error,
      metadata: {
        spend_limit_cents: spendLimitCents.toString(),
      },
    });
    throw error;
  }
}

/**
 * Freeze a virtual card (temporarily disable).
 * 
 * @param cardId - Stripe Card ID
 * @returns Updated Card object
 */
export async function freezeVirtualCard(
  cardId: string
): Promise<Stripe.Issuing.Card> {
  try {
    const stripe = getStripeClient();

    const card = await stripe.issuing.cards.update(cardId, {
      status: "inactive",
    });

    return card;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "freeze_virtual_card",
      resourceType: "stripe_card",
      resourceId: cardId,
      error,
    });
    throw error;
  }
}

/**
 * Unfreeze a virtual card (re-enable).
 * 
 * @param cardId - Stripe Card ID
 * @returns Updated Card object
 */
export async function unfreezeVirtualCard(
  cardId: string
): Promise<Stripe.Issuing.Card> {
  try {
    const stripe = getStripeClient();

    const card = await stripe.issuing.cards.update(cardId, {
      status: "active",
    });

    return card;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "unfreeze_virtual_card",
      resourceType: "stripe_card",
      resourceId: cardId,
      error,
    });
    throw error;
  }
}

