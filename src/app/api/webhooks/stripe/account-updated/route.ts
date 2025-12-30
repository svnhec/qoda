/**
 * POST /api/webhooks/stripe/account-updated
 * =============================================================================
 * Handles Stripe account.updated webhook events.
 * 
 * Updates organization verification status based on:
 * - requirements.currently_due being empty
 * - Sets stripe_account_verified_at once (if null)
 * 
 * CRITICAL: Webhook signature MUST be verified before processing.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature, getEventIdempotencyKey } from "@/lib/stripe/webhook";
import { logWebhookEvent, logAuditError, logFinancialOperation } from "@/lib/db/audit";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  let eventId: string | undefined;
  
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      await logAuditError({
        action: "webhook_account_updated",
        resourceType: "stripe_webhook",
        error: new Error("Missing Stripe-Signature header"),
      });
      return NextResponse.json(
        { error: "Missing Stripe-Signature header" },
        { status: 400 }
      );
    }

    // 2. CRITICAL: Verify webhook signature using RAW body
    const verificationResult = verifyWebhookSignature(rawBody, signature);

    if (!verificationResult.success) {
      await logAuditError({
        action: "webhook_account_updated",
        resourceType: "stripe_webhook",
        error: new Error(verificationResult.error),
      });
      return NextResponse.json(
        { error: verificationResult.error },
        { status: 400 }
      );
    }

    const event = verificationResult.event;
    eventId = event.id;

    // 3. Only process account.updated events
    if (event.type !== "account.updated") {
      // Log but don't process - return success
      await logWebhookEvent({
        provider: "stripe",
        eventType: event.type,
        eventId: event.id,
        success: true,
        metadata: { reason: "Event type not handled by this endpoint" },
      });
      return NextResponse.json({ received: true, handled: false });
    }

    const account = event.data.object as Stripe.Account;
    const accountId = account.id;

    // 4. Check idempotency - have we processed this event?
    const supabase = createServiceClient();
    const idempotencyKey = getEventIdempotencyKey(event);

    const { data: existingLog } = await supabase
      .from("audit_log")
      .select("id")
      .eq("metadata->>idempotency_key", idempotencyKey)
      .single();

    if (existingLog) {
      // Already processed this event
      return NextResponse.json({
        received: true,
        handled: false,
        reason: "Already processed",
      });
    }

    // 5. Find organization by stripe_account_id
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, stripe_account_verified_at")
      .eq("stripe_account_id", accountId)
      .single();

    if (orgError || !org) {
      // Account might not be linked to an org yet - log and return success
      await logWebhookEvent({
        provider: "stripe",
        eventType: event.type,
        eventId: event.id,
        success: true,
        metadata: {
          reason: "No organization found for this Stripe account",
          stripe_account_id: accountId,
        },
      });
      return NextResponse.json({
        received: true,
        handled: false,
        reason: "Organization not found",
      });
    }

    // 6. Extract verification status
    const currentlyDue = account.requirements?.currently_due || [];
    const pastDue = account.requirements?.past_due || [];
    const eventuallyDue = account.requirements?.eventually_due || [];
    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;
    const detailsSubmitted = account.details_submitted;

    // 7. Determine if account is verified
    // Verified when: currently_due is empty AND we haven't set verified_at yet
    const isVerified = currentlyDue.length === 0;
    const shouldSetVerified = isVerified && !org.stripe_account_verified_at;

    // 8. Prepare update payload
    const updatePayload: Record<string, unknown> = {
      stripe_account_requirements_due: currentlyDue,
    };

    // Set verified_at ONCE when requirements are complete
    if (shouldSetVerified) {
      updatePayload.stripe_account_verified_at = new Date().toISOString();
    }

    // If requirements appeared after verification, clear verified_at
    // (Optional: uncomment if you want flip-flop behavior)
    // if (!isVerified && org.stripe_account_verified_at) {
    //   updatePayload.stripe_account_verified_at = null;
    // }

    // 9. Update organization
    const { error: updateError } = await supabase
      .from("organizations")
      .update(updatePayload)
      .eq("id", org.id);

    if (updateError) {
      await logAuditError({
        action: "webhook_account_updated_db_update",
        resourceType: "organization",
        resourceId: org.id,
        error: updateError,
      });
      // Don't fail the webhook - Stripe will retry
    }

    // 10. Log the financial operation
    await logFinancialOperation({
      action: "stripe_account_updated",
      resourceType: "stripe_account",
      resourceId: accountId,
      organizationId: org.id,
      stateBefore: {
        stripe_account_verified_at: org.stripe_account_verified_at,
      },
      stateAfter: {
        stripe_account_verified_at: updatePayload.stripe_account_verified_at,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        details_submitted: detailsSubmitted,
        currently_due: currentlyDue,
        past_due: pastDue,
        eventually_due: eventuallyDue,
      },
      reason: shouldSetVerified
        ? "Account verified - no outstanding requirements"
        : currentlyDue.length > 0
        ? `Account has ${currentlyDue.length} outstanding requirements`
        : "Account status updated",
      metadata: {
        idempotency_key: idempotencyKey,
        stripe_event_id: event.id,
      },
    });

    // 11. Log webhook success
    await logWebhookEvent({
      provider: "stripe",
      eventType: event.type,
      eventId: event.id,
      success: true,
      metadata: {
        organization_id: org.id,
        is_verified: isVerified,
        newly_verified: shouldSetVerified,
        currently_due_count: currentlyDue.length,
        idempotency_key: idempotencyKey,
      },
    });

    // TODO: Send notification to agency if newly verified
    // if (shouldSetVerified) {
    //   await sendNotification(org.id, "Your Stripe account is ready!");
    // }

    return NextResponse.json({
      received: true,
      handled: true,
      organizationId: org.id,
      isVerified,
      newlyVerified: shouldSetVerified,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("Webhook error:", error);

    await logAuditError({
      action: "webhook_account_updated",
      resourceType: "stripe_webhook",
      resourceId: eventId,
      error,
    });

    // Return 200 to prevent Stripe retries for application errors
    // Only return 4xx/5xx for signature verification failures
    return NextResponse.json(
      { error: "Webhook processing failed", received: true },
      { status: 200 }
    );
  }
}

// Disable body parsing - we need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

