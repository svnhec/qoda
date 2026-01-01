/**
 * POST /api/v1/stripe/connect/create-account
 * =============================================================================
 * Creates a Stripe Custom connected account for an organization,
 * or returns an account update link if one already exists.
 * 
 * Requires: Organization owner (role='owner', accepted_at IS NOT NULL)
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logAuditError, logFinancialOperation } from "@/lib/db/audit";
import Stripe from "stripe";

// Initialize Stripe
function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 }
      );
    }

    // 3. Verify user is org owner with accepted membership
    const { data: membership, error: memberError } = await supabase
      .from("org_members")
      .select("role, accepted_at")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can set up Stripe Connect" },
        { status: 403 }
      );
    }

    if (!membership.accepted_at) {
      return NextResponse.json(
        { error: "Your membership has not been accepted" },
        { status: 403 }
      );
    }

    // 4. Get organization details
    const serviceClient = createServiceClient();
    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("id, name, slug, stripe_account_id, billing_email")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const refreshUrl = `${baseUrl}/dashboard/settings/connect?reauth=true`;
    const returnUrl = `${baseUrl}/dashboard/settings/connect?success=true`;

    // 5. IDEMPOTENCY: If stripe_account_id exists, return account update link
    if (org.stripe_account_id) {
      // Check if account exists in Stripe
      try {
        const existingAccount = await stripe.accounts.retrieve(
          org.stripe_account_id
        );

        // If account needs more info, return onboarding link
        // Otherwise return update link
        const linkType =
          existingAccount.requirements?.currently_due?.length ?? 0 > 0
            ? "account_onboarding"
            : "account_update";

        const accountLink = await stripe.accountLinks.create({
          account: org.stripe_account_id,
          type: linkType,
          refresh_url: refreshUrl,
          return_url: returnUrl,
        });

        return NextResponse.json({
          accountLinkUrl: accountLink.url,
          stripeAccountId: org.stripe_account_id,
          isExisting: true,
          linkType,
        });
      } catch (stripeError) {
        // Account might be deleted in Stripe, proceed to create new one
        console.warn(
          "Existing Stripe account not found, creating new one:",
          stripeError
        );
      }
    }

    // 6. Create new Custom connected account
    const account = await stripe.accounts.create({
      type: "custom",
      country: "US",
      email: org.billing_email || user.email,
      capabilities: {
        card_issuing: { requested: true },
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_type: "company",
      business_profile: {
        name: org.name,
        url: `${baseUrl}/org/${org.slug}`,
      },
      metadata: {
        organization_id: org.id,
        organization_name: org.name,
        created_by_user_id: user.id,
        platform: "switchboard",
      },
      tos_acceptance: {
        service_agreement: "full",
      },
    });

    // 7. Update organization with stripe_account_id
    const { error: updateError } = await serviceClient
      .from("organizations")
      .update({
        stripe_account_id: account.id,
        stripe_account_requirements_due: account.requirements?.currently_due || [],
      })
      .eq("id", organization_id);

    if (updateError) {
      // Log but don't fail - the Stripe account was created
      await logAuditError({
        action: "update_organization_stripe_account",
        resourceType: "organization",
        resourceId: organization_id,
        error: updateError,
        userId: user.id,
        organizationId: organization_id,
      });
    }

    // 8. Log the financial operation
    await logFinancialOperation({
      action: "create_stripe_connect_account",
      resourceType: "stripe_account",
      resourceId: account.id,
      userId: user.id,
      organizationId: organization_id,
      stateAfter: {
        stripe_account_id: account.id,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
      },
      reason: "Organization owner initiated Stripe Connect onboarding",
    });

    // 9. Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: "account_onboarding",
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });

    return NextResponse.json({
      accountLinkUrl: accountLink.url,
      stripeAccountId: account.id,
      isExisting: false,
      linkType: "account_onboarding",
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("Create Connect account error:", error);

    await logAuditError({
      action: "create_stripe_connect_account",
      resourceType: "stripe_account",
      error,
    });

    // Handle Stripe-specific errors
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}




