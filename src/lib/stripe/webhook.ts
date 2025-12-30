import Stripe from "stripe";
import { getStripeClient } from "./client";

/**
 * Result of webhook verification.
 */
export type WebhookVerificationResult =
  | { success: true; event: Stripe.Event }
  | { success: false; error: string };

/**
 * Verify a Stripe webhook signature and construct the event.
 * 
 * CRITICAL: Always verify webhook signatures before processing.
 * Never process webhook payloads without verification.
 * 
 * @param rawBody - The raw request body (NOT parsed JSON)
 * @param signature - The Stripe-Signature header value
 * @returns Verification result with event or error
 * 
 * @example
 * ```typescript
 * const result = verifyWebhookSignature(rawBody, signature);
 * if (!result.success) {
 *   return new Response(result.error, { status: 400 });
 * }
 * const event = result.event;
 * // Process event...
 * ```
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string
): WebhookVerificationResult {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return {
      success: false,
      error: "Webhook secret not configured",
    };
  }

  if (!signature) {
    return {
      success: false,
      error: "Missing Stripe-Signature header",
    };
  }

  const stripe = getStripeClient();

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
    return { success: true, event };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return {
      success: false,
      error: `Webhook signature verification failed: ${message}`,
    };
  }
}

/**
 * Extract idempotency key from a Stripe event for deduplication.
 * Uses the event ID which is unique per event.
 * 
 * @param event - Stripe event
 * @returns Idempotency key string
 */
export function getEventIdempotencyKey(event: Stripe.Event): string {
  return `stripe_event_${event.id}`;
}

