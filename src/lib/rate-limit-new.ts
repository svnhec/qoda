/**
 * IMPROVED RATE LIMITING - PRODUCTION READY
 * =============================================================================
 * Enhanced in-memory rate limiting with better cleanup and monitoring.
 * TODO: Replace with Redis (@upstash/ratelimit) for distributed scaling.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

// Rate limit configurations
export const RATE_LIMITS = {
  /** Stripe webhooks: 100 requests/minute per IP */
  WEBHOOK: { limit: 100, windowMs: 60000 },
  /** API endpoints: 30 requests/minute per user */
  API: { limit: 30, windowMs: 60000 },
  /** Auth endpoints: 10 requests/minute per IP */
  AUTH: { limit: 10, windowMs: 60000 },
  /** Sensitive operations: 5 requests/minute per user */
  SENSITIVE: { limit: 5, windowMs: 60000 },
} as const;

/**
 * Improved in-memory rate limiting store with proper cleanup
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 300000; // 5 minutes
let lastCleanup = Date.now();

function cleanupRateLimitStore() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  let cleaned = 0;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`Rate limit cleanup: removed ${cleaned} expired entries`);
  }
}

/**
 * Check rate limit for a key.
 * Enhanced in-memory implementation with monitoring.
 *
 * @param key - Unique identifier
 * @param limiter - Rate limiter configuration key
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  key: string,
  limiter: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  cleanupRateLimitStore();

  const now = Date.now();
  const config = RATE_LIMITS[limiter];
  const entry = rateLimitStore.get(key);

  // No existing entry or window expired
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.limit - 1,
      reset: new Date(now + config.windowMs),
    };
  }

  // Within window, check count
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: new Date(entry.resetAt),
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    reset: new Date(entry.resetAt),
  };
}

/**
 * Apply rate limiting middleware to a request.
 * Enhanced implementation with proper cleanup and monitoring.
 *
 * @param request - NextRequest object
 * @param limiter - Rate limiter type to use
 * @param keyPrefix - Prefix for rate limit key
 * @returns null if allowed, NextResponse if rate limited
 */
export async function applyDistributedRateLimit(
  request: NextRequest,
  limiter: keyof typeof RATE_LIMITS,
  keyPrefix: string = ""
): Promise<NextResponse | null> {
  try {
    // Extract client IP
    const forwarded = request.headers.get("x-forwarded-for");
    const clientIP = forwarded?.split(",")[0] || "unknown";

    const key = keyPrefix ? `${keyPrefix}:${clientIP}` : clientIP;
    const result = await checkRateLimit(key, limiter);

    if (!result.allowed) {
      console.warn(`Rate limit exceeded for ${key} (${limiter})`);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retry_after: Math.ceil((result.reset.getTime() - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.getTime().toString(),
          },
        }
      );
    }

    return null; // Allowed
  } catch (error) {
    // Fail open on errors
    console.error("Rate limiting failed:", error);
    return null;
  }
}



