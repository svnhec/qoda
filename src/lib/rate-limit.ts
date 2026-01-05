/**
 * DISTRIBUTED RATE LIMITING - PRODUCTION READY
 * =============================================================================
 * Uses Redis when available, falls back to enhanced in-memory implementation.
 * For production: Install Redis and set REDIS_URL environment variable.
 * For development: Uses in-memory with proper cleanup.
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

// Redis client initialization
let redisClient: any = null;
let redisConnected = false;

async function initializeRedis() {
  if (redisConnected) return redisClient;

  try {
    const { createClient } = await import('redis');

    // Support multiple Redis URL formats
    const redisUrl = process.env.REDIS_URL ||
                     process.env.REDIS_URI ||
                     process.env.UPSTASH_REDIS_REST_URL ||
                     'redis://localhost:6379';

    redisClient = createClient({ url: redisUrl });

    await redisClient.connect();
    redisConnected = true;

    console.log('✅ Redis connected successfully for distributed rate limiting');
    return redisClient;

  } catch (error) {
    console.warn('⚠️  Redis connection failed, falling back to in-memory rate limiting:', (error as Error).message);
    console.warn('💡 To enable Redis: set REDIS_URL environment variable and ensure Redis is running');
    return null;
  }
}

// Redis support for production deployment
// Now enabled with Redis client installed

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
 * Uses Redis when available, falls back to enhanced in-memory implementation.
 *
 * @param key - Unique identifier
 * @param limiter - Rate limiter configuration key
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  key: string,
  limiter: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const config = RATE_LIMITS[limiter];
  const now = Date.now();
  const windowKey = `${limiter}:${key}`;

  // Try Redis first
  const redis = await initializeRedis();
  if (redis && redis.isOpen) {
    try {
      const countKey = `${windowKey}:count`;
      const resetKey = `${windowKey}:reset`;

      // Get current count and reset time
      const [currentCount, resetAt] = await Promise.all([
        redis.get(countKey),
        redis.get(resetKey)
      ]);

      const count = parseInt(currentCount || '0') || 0;
      const resetTime = parseInt(resetAt || '0') || 0;

      // Check if window has expired
      if (!resetAt || resetTime < now) {
        // New window
        const newResetTime = now + config.windowMs;

        await Promise.all([
          redis.setEx(countKey, Math.ceil(config.windowMs / 1000), '1'),
          redis.setEx(resetKey, Math.ceil(config.windowMs / 1000), newResetTime.toString())
        ]);

        return {
          allowed: true,
          remaining: config.limit - 1,
          reset: new Date(newResetTime),
        };
      }

      // Within window
      if (count >= config.limit) {
        return {
          allowed: false,
          remaining: 0,
          reset: new Date(resetTime),
        };
      }

      // Increment count
      await redis.incr(countKey);

      return {
        allowed: true,
        remaining: config.limit - count - 1,
        reset: new Date(resetTime),
      };

    } catch (error) {
      console.warn('⚠️  Redis rate limit check failed, falling back to in-memory:', (error as Error).message);
      // Fall through to in-memory implementation
    }
  }

  // Fallback to in-memory implementation
  cleanupRateLimitStore();

  const entry = rateLimitStore.get(windowKey);

  // No existing entry or window expired
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(windowKey, {
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
