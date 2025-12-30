import Stripe from "stripe";

/**
 * Server-side Stripe client.
 * Uses the secret key for server operations.
 * 
 * NEVER expose this client or the secret key to the browser.
 */
export function getStripeClient(): Stripe {
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
 * Get the Stripe publishable key for client-side use.
 */
export function getStripePublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable."
    );
  }

  return publishableKey;
}

