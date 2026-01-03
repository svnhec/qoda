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
import { getStripeClient } from "@/lib/stripe/client";

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

