/**
 * POST /api/webhooks/stripe/issuing-authorizations
 * =============================================================================
 * Real-time authorization webhook for Stripe Issuing.
 * 
 * CRITICAL TIMING: Must respond within 2 seconds or Stripe auto-declines.
 * 
 * Flow:
 * 1. Verify signature immediately (<2 sec response required)
 * 2. Extract: authorization.id, amount, card.id, merchant.category
 * 3. Query virtual_cards → get agent_id, organization_id
 * 4. Query agents → get budget, velocity limits, status, merchant controls
 * 5. Check agent status (circuit breaker: green/yellow/red)
 * 6. Check merchant category whitelist/blacklist
 * 7. Budget check: current_spend_cents + amount <= monthly_budget_cents
 * 8. Velocity check: hard limits block, soft limits warn
 * 9. Return { approved: true } or { approved: false, decline_code: ... }
 * 10. After 200 response: Log and update velocity metrics (async)
 * 
 * Per .cursorrules:
 * - Webhook signature MUST be verified using stripe.webhooks.constructEvent()
 * - Raw request body MUST be used for signature verification
 * - All monetary values as BigInt (cents)
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/stripe/webhook";
import { logWebhookEvent, logAuditError } from "@/lib/db/audit";
import { recordTransaction } from "@/lib/db/ledger";
import { applyRateLimit, RATE_LIMITS } from "@/lib/security";
import {
    type VirtualCardRow,
    serializeAuthorizationLogInsert,
} from "@/lib/db/types";
import Stripe from "stripe";

// Environment variables
const ENABLE_STRIPE_ISSUING = process.env.ENABLE_STRIPE_ISSUING === "true";

/**
 * Authorization decision result.
 */
interface AuthorizationDecision {
    approved: boolean;
    decline_code?: string;
    reason?: string;
}

/**
 * Agent status type for circuit breaker.
 */
type AgentStatus = 'green' | 'yellow' | 'red';

/**
 * Extended agent data for authorization checks.
 */
interface AgentAuthData {
    monthly_budget_cents: string;
    current_spend_cents: string;
    is_active: boolean;
    status: AgentStatus;
    soft_limit_cents_per_minute: string | null;
    hard_limit_cents_per_minute: string | null;
    soft_limit_cents_per_day: string | null;
    hard_limit_cents_per_day: string | null;
    today_spend_cents: string;
    today_date: string;
    allowed_merchant_categories: string[] | null;
    blocked_merchant_categories: string[] | null;
}

/**
 * Context for async logging after response.
 */
interface AuthorizationContext {
    authorizationId: string;
    cardId: string;
    amountCents: bigint;
    merchantName: string | null;
    merchantCategory: string | null;
    organizationId: string | null;
    agentId: string | null;
    decision: AuthorizationDecision;
    processingTimeMs: number;
}

/**
 * POST handler for issuing.authorization.request events.
 * 
 * CRITICAL: This must be synchronous and fast - Stripe requires a response
 * within 2 seconds or it will auto-decline the authorization.
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    // Check if Stripe Issuing is enabled
    if (!ENABLE_STRIPE_ISSUING) {
        console.warn("Stripe Issuing disabled - ignoring authorization webhook");
        return NextResponse.json({ received: true, disabled: true });
    }

    // Rate limiting for webhooks
    const rateLimited = applyRateLimit(request, "webhook:issuing-auth", RATE_LIMITS.WEBHOOK);
    if (rateLimited) return rateLimited;

    try {
        // 1. Get raw body for signature verification
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            // Fire-and-forget error logging
            logAuditError({
                action: "issuing_authorization",
                resourceType: "stripe_webhook",
                error: new Error("Missing Stripe-Signature header"),
            }).catch(console.error);

            return NextResponse.json(
                { error: "Missing Stripe-Signature header" },
                { status: 400 }
            );
        }

        // 2. CRITICAL: Verify webhook signature using RAW body
        const verificationResult = verifyWebhookSignature(rawBody, signature);

        if (!verificationResult.success) {
            // Fire-and-forget error logging
            logAuditError({
                action: "issuing_authorization",
                resourceType: "stripe_webhook",
                error: new Error(verificationResult.error),
            }).catch(console.error);

            return NextResponse.json(
                { error: verificationResult.error },
                { status: 400 }
            );
        }

        const event = verificationResult.event;

        // 3. Only handle issuing_authorization.request events
        if (event.type !== "issuing_authorization.request") {
            // Not an authorization request - acknowledge but don't process
            return NextResponse.json({ received: true, handled: false });
        }

        const authorization = event.data.object as Stripe.Issuing.Authorization;
        const authorizationId = authorization.id;
        const cardId = authorization.card.id;
        const amountCents = BigInt(authorization.amount);
        const merchantCategory = authorization.merchant_data.category || null;
        const merchantName = authorization.merchant_data.name || null;

        // 4. Get virtual card info from database
        const supabase = createServiceClient();

        const { data: cardData, error: cardError } = await supabase
            .from("virtual_cards")
            .select("agent_id, organization_id, is_active")
            .eq("id", cardId)
            .single<Pick<VirtualCardRow, "agent_id" | "organization_id" | "is_active">>();

        if (cardError || !cardData) {
            // Card not found in our system - decline
            const decision: AuthorizationDecision = {
                approved: false,
                decline_code: "card_inactive",
                reason: "Card not found in Switchboard",
            };
            return buildAuthorizationResponse(decision, startTime, {
                authorizationId,
                cardId,
                amountCents,
                merchantName,
                merchantCategory,
                organizationId: null,
                agentId: null,
            });
        }

        // 5. Check if card is active
        if (!cardData.is_active) {
            const decision: AuthorizationDecision = {
                approved: false,
                decline_code: "card_inactive",
                reason: "Card is inactive",
            };
            return buildAuthorizationResponse(decision, startTime, {
                authorizationId,
                cardId,
                amountCents,
                merchantName,
                merchantCategory,
                organizationId: cardData.organization_id,
                agentId: cardData.agent_id,
            });
        }

        // 6. Get agent budget and velocity info
        const { data: agentData, error: agentError } = await supabase
            .from("agents")
            .select(`
                monthly_budget_cents, 
                current_spend_cents, 
                is_active,
                status,
                soft_limit_cents_per_minute,
                hard_limit_cents_per_minute,
                soft_limit_cents_per_day,
                hard_limit_cents_per_day,
                today_spend_cents,
                today_date,
                allowed_merchant_categories,
                blocked_merchant_categories
            `)
            .eq("id", cardData.agent_id)
            .single<AgentAuthData>();

        if (agentError || !agentData) {
            const decision: AuthorizationDecision = {
                approved: false,
                decline_code: "processing_error",
                reason: "Agent not found",
            };
            return buildAuthorizationResponse(decision, startTime, {
                authorizationId,
                cardId,
                amountCents,
                merchantName,
                merchantCategory,
                organizationId: cardData.organization_id,
                agentId: cardData.agent_id,
            });
        }

        // 7. Check if agent is active
        if (!agentData.is_active) {
            const decision: AuthorizationDecision = {
                approved: false,
                decline_code: "card_inactive",
                reason: "Agent is inactive",
            };
            return buildAuthorizationResponse(decision, startTime, {
                authorizationId,
                cardId,
                amountCents,
                merchantName,
                merchantCategory,
                organizationId: cardData.organization_id,
                agentId: cardData.agent_id,
            });
        }

        // 8. CHECK AGENT STATUS (Circuit Breaker)
        const agentStatus = agentData.status as AgentStatus;
        if (agentStatus === 'red') {
            const decision: AuthorizationDecision = {
                approved: false,
                decline_code: "card_inactive",
                reason: "Agent is frozen (circuit breaker tripped)",
            };
            return buildAuthorizationResponse(decision, startTime, {
                authorizationId,
                cardId,
                amountCents,
                merchantName,
                merchantCategory,
                organizationId: cardData.organization_id,
                agentId: cardData.agent_id,
            });
        }

        // 9. CHECK MERCHANT CATEGORY
        if (merchantCategory) {
            const blockedCategories = agentData.blocked_merchant_categories;
            const allowedCategories = agentData.allowed_merchant_categories;

            // Check blocked list first
            if (blockedCategories && blockedCategories.includes(merchantCategory)) {
                const decision: AuthorizationDecision = {
                    approved: false,
                    decline_code: "spending_controls",
                    reason: `Merchant category blocked: ${merchantCategory}`,
                };
                return buildAuthorizationResponse(decision, startTime, {
                    authorizationId,
                    cardId,
                    amountCents,
                    merchantName,
                    merchantCategory,
                    organizationId: cardData.organization_id,
                    agentId: cardData.agent_id,
                });
            }

            // Check allowed list (if defined, must be in list)
            if (allowedCategories && allowedCategories.length > 0 && !allowedCategories.includes(merchantCategory)) {
                const decision: AuthorizationDecision = {
                    approved: false,
                    decline_code: "spending_controls",
                    reason: `Merchant category not allowed: ${merchantCategory}`,
                };
                return buildAuthorizationResponse(decision, startTime, {
                    authorizationId,
                    cardId,
                    amountCents,
                    merchantName,
                    merchantCategory,
                    organizationId: cardData.organization_id,
                    agentId: cardData.agent_id,
                });
            }
        }

        // 10. BUDGET CHECK: current_spend_cents + amount <= monthly_budget_cents
        const monthlyBudgetCents = BigInt(agentData.monthly_budget_cents);
        const currentSpendCents = BigInt(agentData.current_spend_cents);
        const projectedSpend = currentSpendCents + amountCents;

        if (projectedSpend > monthlyBudgetCents) {
            const decision: AuthorizationDecision = {
                approved: false,
                decline_code: "insufficient_funds",
                reason: `Budget exceeded: ${projectedSpend} > ${monthlyBudgetCents}`,
            };
            return buildAuthorizationResponse(decision, startTime, {
                authorizationId,
                cardId,
                amountCents,
                merchantName,
                merchantCategory,
                organizationId: cardData.organization_id,
                agentId: cardData.agent_id,
            });
        }

        // 11. VELOCITY CHECK: Hard limits block, soft limits allow but warn
        // Check daily hard limit
        const todayDate = new Date().toISOString().split('T')[0];
        let todaySpendCents = BigInt(agentData.today_spend_cents || '0');

        // Reset daily spend if new day
        if (agentData.today_date !== todayDate) {
            todaySpendCents = 0n;
        }

        const projectedDailySpend = todaySpendCents + amountCents;

        // Check daily hard limit
        if (agentData.hard_limit_cents_per_day) {
            const hardLimitDay = BigInt(agentData.hard_limit_cents_per_day);
            if (projectedDailySpend > hardLimitDay) {
                const decision: AuthorizationDecision = {
                    approved: false,
                    decline_code: "spending_controls",
                    reason: `Daily hard limit exceeded: ${projectedDailySpend} > ${hardLimitDay}`,
                };
                return buildAuthorizationResponse(decision, startTime, {
                    authorizationId,
                    cardId,
                    amountCents,
                    merchantName,
                    merchantCategory,
                    organizationId: cardData.organization_id,
                    agentId: cardData.agent_id,
                });
            }
        }

        // Check per-minute hard limit (simplified: just check transaction amount)
        if (agentData.hard_limit_cents_per_minute) {
            const hardLimitMinute = BigInt(agentData.hard_limit_cents_per_minute);
            if (amountCents > hardLimitMinute) {
                const decision: AuthorizationDecision = {
                    approved: false,
                    decline_code: "spending_controls",
                    reason: `Transaction exceeds per-minute hard limit: ${amountCents} > ${hardLimitMinute}`,
                };
                return buildAuthorizationResponse(decision, startTime, {
                    authorizationId,
                    cardId,
                    amountCents,
                    merchantName,
                    merchantCategory,
                    organizationId: cardData.organization_id,
                    agentId: cardData.agent_id,
                });
            }
        }

        // 12. APPROVE the transaction
        const decision: AuthorizationDecision = {
            approved: true,
            reason: "All checks passed",
        };

        return buildAuthorizationResponse(decision, startTime, {
            authorizationId,
            cardId,
            amountCents,
            merchantName,
            merchantCategory,
            organizationId: cardData.organization_id,
            agentId: cardData.agent_id,
        });
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        console.error("Authorization webhook error:", error);

        // Fire-and-forget error logging
        logAuditError({
            action: "issuing_authorization",
            resourceType: "stripe_webhook",
            error,
        }).catch(console.error);

        // Return decline on any error - must return 200 for Stripe
        return NextResponse.json(
            { approved: false, decline_code: "processing_error" },
            { status: 200 }
        );
    }
}

/**
 * Build the authorization response and trigger async logging.
 * 
 * IMPORTANT: Async logging is fire-and-forget to ensure fast response.
 */
function buildAuthorizationResponse(
    decision: AuthorizationDecision,
    startTime: number,
    context: Omit<AuthorizationContext, "decision" | "processingTimeMs">
): NextResponse {
    const processingTimeMs = Date.now() - startTime;

    // Log timing for monitoring
    if (processingTimeMs > 1500) {
        console.warn(
            `Authorization response time: ${processingTimeMs}ms (approaching 2s limit)`
        );
    }

    // Fire-and-forget: Log authorization to database
    // This Promise is intentionally not awaited
    logAuthorizationAsync({
        ...context,
        decision,
        processingTimeMs,
    }).catch((err) => {
        console.error("Failed to log authorization:", err);
    });

    if (decision.approved) {
        return NextResponse.json({ approved: true }, { status: 200 });
    } else {
        return NextResponse.json(
            {
                approved: false,
                // Use Stripe's decline codes: https://stripe.com/docs/issuing/controls/real-time-authorizations
                decline_code: decision.decline_code || "not_allowed",
            },
            { status: 200 }
        );
    }
}

/**
 * Async logging of authorization to database.
 * 
 * IMPORTANT: This is called fire-and-forget from buildAuthorizationResponse.
 * Never await this in the main flow - the Promise runs after response is sent.
 * 
 * For approved authorizations, this also creates a pending journal entry:
 * - Debit: Agent Wallet (liability - money reserved)
 * - Credit: Pending Authorization Liability (liability - awaiting settlement)
 */
async function logAuthorizationAsync(context: AuthorizationContext): Promise<void> {
    const {
        authorizationId,
        cardId,
        amountCents,
        merchantName,
        merchantCategory,
        organizationId,
        agentId,
        decision,
        processingTimeMs,
    } = context;

    try {
        const supabase = createServiceClient();

        // Insert into authorizations_log
        const logEntry = serializeAuthorizationLogInsert({
            stripe_authorization_id: authorizationId,
            card_id: cardId,
            amount_cents: amountCents,
            merchant_name: merchantName,
            merchant_category: merchantCategory,
            approved: decision.approved,
            decline_code: decision.decline_code ?? null,
        });

        const { error } = await supabase
            .from("authorizations_log")
            .insert(logEntry);

        if (error) {
            console.error("Failed to insert authorization log:", error);
        }

        // If approved and we have organization/agent info, create pending journal entry
        if (decision.approved && organizationId && agentId) {
            // Create pending journal entry:
            // Debit: 2300 (Agent Wallet Liability - reduce liability = money reserved)
            // Credit: 2400 (Pending Auth Liability - increase liability = pending settlement)
            const journalResult = await recordTransaction({
                organizationId,
                description: `Pending auth: ${merchantName || "Unknown merchant"}`,
                metadata: {
                    stripe_authorization_id: authorizationId,
                    card_id: cardId,
                    agent_id: agentId,
                    merchant_name: merchantName,
                    merchant_category: merchantCategory,
                    status: "pending",
                },
                entries: [
                    {
                        accountCode: "2300", // Agent Wallet Liability
                        debit: amountCents,
                        credit: 0n,
                    },
                    {
                        accountCode: "2400", // Pending Authorization Liability
                        debit: 0n,
                        credit: amountCents,
                    },
                ],
            });

            if (!journalResult.success) {
                console.error("Failed to create pending journal entry:", journalResult.error);
            }
        }

        // Log webhook event to audit_log
        await logWebhookEvent({
            provider: "stripe",
            eventType: "issuing_authorization.request",
            eventId: authorizationId,
            success: true,
            metadata: {
                card_id: cardId,
                amount_cents: amountCents.toString(),
                merchant_name: merchantName,
                merchant_category: merchantCategory,
                approved: decision.approved,
                decline_code: decision.decline_code,
                decline_reason: decision.reason,
                processing_time_ms: processingTimeMs,
            },
        });
    } catch (err) {
        console.error("Authorization async logging failed:", err);
        // Never throw from async logging
    }
}
