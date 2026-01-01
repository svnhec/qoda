/**
 * SWITCHBOARD SECURITY UTILITIES
 * =============================================================================
 * Security helpers for webhook validation, authentication, and rate limiting.
 *
 * Functions:
 * - validateWebhookSignature: Verify Stripe webhook signatures
 * - requireAuth: Middleware for protected routes
 * - requireRole: Role-based access control
 * - rateLimit: In-memory rate limiting (MVP)
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { logAuditError } from "@/lib/db/audit";

// =============================================================================
// TYPES
// =============================================================================

export type OrgRole = "owner" | "admin" | "member";

export interface AuthResult {
    success: true;
    user: { id: string; email: string };
    organizationId: string;
    role: OrgRole;
}

export interface AuthError {
    success: false;
    error: string;
    status: 401 | 403;
}

// =============================================================================
// WEBHOOK SIGNATURE VALIDATION
// =============================================================================

/**
 * Validate Stripe webhook signature.
 * MUST be called first in webhook handlers before any processing.
 *
 * @param body - Raw request body as string
 * @param signature - Stripe-Signature header
 * @param secret - Webhook signing secret
 * @returns Verified Stripe event
 * @throws Error if signature is invalid
 */
export function validateWebhookSignature(
    body: string,
    signature: string,
    secret: string
): Stripe.Event {
    if (!signature) {
        throw new Error("Missing Stripe-Signature header");
    }

    if (!secret) {
        throw new Error("Webhook secret not configured");
    }

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-02-24.acacia",
        });

        return stripe.webhooks.constructEvent(body, signature, secret);
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Webhook signature verification failed");
        throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
}

/**
 * Get the appropriate webhook secret based on event type.
 */
export function getWebhookSecret(eventType: string): string {
    // Different webhook endpoints may have different secrets
    if (eventType.startsWith("issuing_authorization")) {
        return process.env.STRIPE_ISSUING_AUTH_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
    }
    if (eventType.startsWith("issuing_transaction")) {
        return process.env.STRIPE_ISSUING_TXN_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
    }
    if (eventType.startsWith("account")) {
        return process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
    }
    return process.env.STRIPE_WEBHOOK_SECRET || "";
}

// =============================================================================
// AUTHENTICATION & AUTHORIZATION
// =============================================================================

/**
 * Authenticate user and verify organization membership.
 * Use in protected API routes.
 *
 * @returns Auth result with user, org, and role, or error response
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return {
                success: false,
                error: "Unauthorized",
                status: 401,
            };
        }

        // Get user's default organization
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            return {
                success: false,
                error: "No organization found",
                status: 403,
            };
        }

        // Get membership and role
        const { data: membership } = await supabase
            .from("org_members")
            .select("role, accepted_at")
            .eq("organization_id", profile.default_organization_id)
            .eq("user_id", user.id)
            .single();

        if (!membership || !membership.accepted_at) {
            return {
                success: false,
                error: "Not a member of this organization",
                status: 403,
            };
        }

        return {
            success: true,
            user: { id: user.id, email: user.email || "" },
            organizationId: profile.default_organization_id,
            role: membership.role as OrgRole,
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Auth error");
        await logAuditError({
            action: "require_auth",
            resourceType: "auth",
            error,
        });
        return {
            success: false,
            error: "Authentication failed",
            status: 401,
        };
    }
}

/**
 * Check if user has required role.
 *
 * @param userRole - User's actual role
 * @param requiredRoles - Roles that are allowed
 * @returns true if user has one of the required roles
 */
export function hasRole(userRole: OrgRole, requiredRoles: OrgRole[]): boolean {
    return requiredRoles.includes(userRole);
}

/**
 * Check if user is admin or owner.
 */
export function isAdminOrOwner(role: OrgRole): boolean {
    return hasRole(role, ["owner", "admin"]);
}

// =============================================================================
// RATE LIMITING (In-Memory for MVP)
// =============================================================================

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// In-memory store (reset on server restart - acceptable for MVP)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL_MS = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupRateLimitStore() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

    lastCleanup = now;
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /** Maximum requests allowed */
    limit: number;
    /** Window size in milliseconds */
    windowMs: number;
}

/**
 * Default rate limit configurations
 */
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
 * Check rate limit for a key.
 *
 * @param key - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining count
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig = RATE_LIMITS.API
): { allowed: boolean; remaining: number; resetAt: number } {
    cleanupRateLimitStore();

    const now = Date.now();
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
            resetAt: now + config.windowMs,
        };
    }

    // Within window, check count
    if (entry.count >= config.limit) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.resetAt,
        };
    }

    // Increment count
    entry.count++;
    return {
        allowed: true,
        remaining: config.limit - entry.count,
        resetAt: entry.resetAt,
    };
}

/**
 * Create rate-limited response if limit exceeded.
 */
export function rateLimitResponse(resetAt: number): NextResponse {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
            status: 429,
            headers: {
                "Retry-After": String(retryAfter),
                "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
            },
        }
    );
}

/**
 * Extract client IP from request.
 * Works with Vercel, Cloudflare, and direct connections.
 */
export function getClientIP(request: NextRequest): string {
    // Try X-Forwarded-For first (most common)
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const firstIP = forwarded.split(",")[0];
        if (firstIP) {
            return firstIP.trim();
        }
    }

    // Cloudflare
    const cfIP = request.headers.get("cf-connecting-ip");
    if (cfIP) return cfIP;

    // Vercel
    const realIP = request.headers.get("x-real-ip");
    if (realIP) return realIP;

    // Fallback
    return "unknown";
}

// =============================================================================
// MIDDLEWARE HELPERS
// =============================================================================

/**
 * Apply rate limiting middleware to a request.
 *
 * @param request - Next.js request
 * @param keyPrefix - Prefix for rate limit key (e.g., "api", "webhook")
 * @param config - Rate limit configuration
 * @returns null if allowed, NextResponse if rate limited
 */
export function applyRateLimit(
    request: NextRequest,
    keyPrefix: string,
    config: RateLimitConfig = RATE_LIMITS.API
): NextResponse | null {
    const ip = getClientIP(request);
    const key = `${keyPrefix}:${ip}`;

    const result = checkRateLimit(key, config);

    if (!result.allowed) {
        return rateLimitResponse(result.resetAt);
    }

    return null;
}

/**
 * Validate that request is from Stripe (for webhooks).
 * Returns appropriate error response if invalid.
 */
export async function validateStripeWebhook(
    request: NextRequest,
    secretEnvVar: string = "STRIPE_WEBHOOK_SECRET"
): Promise<{ event: Stripe.Event } | { error: NextResponse }> {
    try {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            return {
                error: NextResponse.json(
                    { error: "Missing Stripe-Signature header" },
                    { status: 400 }
                ),
            };
        }

        const secret = process.env[secretEnvVar];
        if (!secret) {
            console.error(`Webhook secret not configured: ${secretEnvVar}`);
            return {
                error: NextResponse.json(
                    { error: "Webhook configuration error" },
                    { status: 500 }
                ),
            };
        }

        const event = validateWebhookSignature(body, signature, secret);
        return { event };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Webhook validation failed");
        console.error("Webhook validation error:", error.message);
        return {
            error: NextResponse.json(
                { error: error.message },
                { status: 400 }
            ),
        };
    }
}
