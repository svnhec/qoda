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
 * Virtual card configuration for an agent.
 */
export interface VirtualCardConfig {
  /** Organization UUID (for metadata tagging) */
  organizationId: string;
  /** Agent UUID (for metadata tagging) */
  agentId: string;
  /** Agent/project name for display */
  agentName: string;
  /** Monthly spending limit in cents (BigInt) */
  spendLimitCents: bigint;
  /** Optional client UUID (for client-specific agents) */
  clientId?: string;
  /** Cardholder billing address */
  billing?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  /** Allowed merchant category codes (comma-separated or array) */
  allowedCategories?: string[];
  /** Blocked merchant category codes (comma-separated or array) */
  blockedCategories?: string[];
}

/**
 * Create a virtual card for an agent/project.
 * 
 * PLATFORM ISSUING: Cards are issued on the Switchboard platform account,
 * NOT on individual agency connected accounts. Cards are tagged with
 * organization_id and agent_id in metadata for attribution.
 * 
 * CRITICAL: Amounts are in cents as BigInt. Never use number/float.
 * 
 * @param config - Virtual card configuration
 * @returns Stripe Card object
 * 
 * @example
 * ```typescript
 * const card = await createVirtualCard({
 *   organizationId: "org_123",
 *   agentId: "agent_456",
 *   agentName: "CustomerSupportBot",
 *   spendLimitCents: 50000n,  // $500.00 monthly limit
 *   clientId: "client_789",
 *   billing: {
 *     line1: "123 Main St",
 *     city: "San Francisco",
 *     state: "CA",
 *     postalCode: "94102",
 *   },
 * });
 * ```
 */
export async function createVirtualCard(
  config: VirtualCardConfig
): Promise<Stripe.Issuing.Card> {
  const {
    organizationId,
    agentId,
    agentName,
    spendLimitCents,
    clientId,
    billing,
    allowedCategories,
    blockedCategories,
  } = config;

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

    // Metadata for attribution (used in webhooks for rebilling)
    const cardMetadata: Record<string, string> = {
      organization_id: organizationId,
      agent_id: agentId,
      agent_name: agentName,
      spend_limit_cents: spendLimitCents.toString(),
      created_by: "switchboard",
      platform: "switchboard",
    };

    if (clientId) {
      cardMetadata.client_id = clientId;
    }

    // Create cardholder first (required for Issuing)
    // Cardholder represents the "agent" in our system
    const cardholder = await stripe.issuing.cardholders.create({
      name: agentName,
      type: "individual",
      status: "active",
      billing: {
        address: {
          line1: billing?.line1 || "Platform Agent",
          city: billing?.city || "San Francisco",
          state: billing?.state || "CA",
          postal_code: billing?.postalCode || "94102",
          country: billing?.country || "US",
        },
      },
      metadata: cardMetadata,
    });

    // Build spending controls
    const spendingControls: Stripe.Issuing.CardCreateParams.SpendingControls = {
      spending_limits: [
        {
          amount: spendLimitNumber,
          interval: "monthly",
        },
      ],
    };

    if (allowedCategories && allowedCategories.length > 0) {
      spendingControls.allowed_categories =
        allowedCategories as Stripe.Issuing.CardCreateParams.SpendingControls.AllowedCategory[];
    }

    if (blockedCategories && blockedCategories.length > 0) {
      spendingControls.blocked_categories =
        blockedCategories as Stripe.Issuing.CardCreateParams.SpendingControls.BlockedCategory[];
    }

    // Create the virtual card on PLATFORM account
    // Cards are NOT created on connected accounts - all issuing is centralized
    const card = await stripe.issuing.cards.create({
      cardholder: cardholder.id,
      currency: "usd",
      type: "virtual",
      status: "active",
      spending_controls: spendingControls,
      metadata: cardMetadata,
    });

    return card;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    await logAuditError({
      action: "create_virtual_card",
      resourceType: "stripe_card",
      error,
      organizationId,
      metadata: {
        agent_id: agentId,
        agent_name: agentName,
        client_id: clientId,
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

