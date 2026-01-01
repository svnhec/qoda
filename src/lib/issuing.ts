/**
 * SWITCHBOARD VIRTUAL CARD ISSUING SERVICE
 * =============================================================================
 * Service layer for issuing virtual cards to agents via Stripe Issuing.
 *
 * ARCHITECTURE:
 * - Cards are issued on the CONNECTED ACCOUNT (org.stripe_account_id)
 * - Uses { stripeAccount: org.stripe_account_id } for all Issuing API calls
 * - Metadata tags cards with organization_id + agent_id for attribution
 * - Idempotent: returns existing active card if one exists
 * - All errors logged to audit_log
 *
 * CRITICAL INVARIANTS:
 * - Each agent can have AT MOST one active card (enforced by DB index)
 * - Organization must be Stripe-verified before issuing
 * - All monetary amounts are BigInt in cents
 * =============================================================================
 */

import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";
import { logAuditError, logFinancialOperation } from "@/lib/db/audit";
import {
    type Agent,
    type AgentRow,
    type Organization,
    type VirtualCardRow,
    type VirtualCardInsert,
    parseAgent,
    parseVirtualCard,
    serializeVirtualCardInsert,
} from "@/lib/db/types";
import type { CentsAmount } from "@/lib/types/currency";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Input for issuing a virtual card to an agent.
 */
export interface IssueVirtualCardInput {
    /** Agent UUID */
    agent_id: string;
    /** Organization UUID (must match agent's organization) */
    organization_id: string;
    /** Monthly spending limit in cents. Defaults to agent's monthly_budget_cents if not provided */
    spend_limit_cents?: CentsAmount;
    /** Optional allowed MCC categories (if not specified, all categories allowed) */
    allowed_categories?: string[];
    /** Optional blocked MCC categories */
    blocked_categories?: string[];
}

/**
 * Output from successful card issuance.
 */
export interface IssueVirtualCardOutput {
    /** Stripe card ID (stored as virtual_cards.id) */
    card_id: string;
    /** Last 4 digits of card number */
    last4: string;
    /** Expiration month (1-12) */
    exp_month: number;
    /** Expiration year (YYYY) */
    exp_year: number;
    /** Card brand (visa) */
    brand: string;
    /** Whether this was an existing card (idempotent return) */
    is_existing: boolean;
}

/**
 * Result type for card operations.
 * Uses discriminated union for type-safe error handling.
 */
export type IssueCardResult =
    | { success: true; data: IssueVirtualCardOutput }
    | { success: false; error: string; code: IssueCardErrorCode };

/**
 * Error codes for card issuance failures.
 */
export type IssueCardErrorCode =
    | "AGENT_NOT_FOUND"
    | "ORGANIZATION_NOT_FOUND"
    | "ORG_MISMATCH"
    | "ORG_NOT_VERIFIED"
    | "STRIPE_ACCOUNT_MISSING"
    | "AGENT_INACTIVE"
    | "NO_BUDGET_CONFIGURED"
    | "STRIPE_CARDHOLDER_ERROR"
    | "STRIPE_CARD_ERROR"
    | "DATABASE_ERROR"
    | "UNKNOWN_ERROR";

// =============================================================================
// MAIN FUNCTION: issueVirtualCardForAgent
// =============================================================================

/**
 * Issue a virtual card for an agent.
 *
 * This is the primary entry point for card issuance. It performs:
 * 1. Validation: Agent exists, belongs to org, org is Stripe-verified
 * 2. Idempotency: If agent already has an active card, returns it
 * 3. Stripe Issuing: Creates cardholder + card on CONNECTED account (org.stripe_account_id)
 * 4. Database: Persists card to virtual_cards table
 * 5. Audit: Logs all operations and errors
 *
 * @param input - Card issuance parameters
 * @returns Result with card details or error
 *
 * @example
 * ```typescript
 * const result = await issueVirtualCardForAgent({
 *   agent_id: "uuid-of-agent",
 *   organization_id: "uuid-of-org",
 *   spend_limit_cents: 50000n, // $500.00
 * });
 *
 * if (result.success) {
 *   console.log("Card issued:", result.data.card_id);
 * } else {
 *   console.error("Failed:", result.error, result.code);
 * }
 * ```
 */
export async function issueVirtualCardForAgent(
    input: IssueVirtualCardInput
): Promise<IssueCardResult> {
    const { agent_id, organization_id, allowed_categories, blocked_categories } = input;

    // Use service client to bypass RLS (this is a trusted server operation)
    const supabase = createServiceClient();
    let stripe: Stripe;

    try {
        stripe = getStripeClient();
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to initialize Stripe client");
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "stripe_client",
            error,
            organizationId: organization_id,
            metadata: { agent_id },
        });
        return {
            success: false,
            error: "Stripe client initialization failed",
            code: "UNKNOWN_ERROR",
        };
    }

    // -------------------------------------------------------------------------
    // STEP 1: Fetch and validate agent
    // -------------------------------------------------------------------------
    const { data: agentRow, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agent_id)
        .single();

    if (agentError || !agentRow) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "agent",
            resourceId: agent_id,
            error: agentError ?? new Error("Agent not found"),
            organizationId: organization_id,
        });
        return {
            success: false,
            error: `Agent not found: ${agent_id}`,
            code: "AGENT_NOT_FOUND",
        };
    }

    // Parse the raw row to get proper BigInt types
    const agent: Agent = parseAgent(agentRow as AgentRow);

    // Verify agent belongs to the specified organization
    if (agent.organization_id !== organization_id) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "agent",
            resourceId: agent_id,
            error: new Error("Agent does not belong to specified organization"),
            organizationId: organization_id,
            metadata: {
                agent_org_id: agent.organization_id,
                requested_org_id: organization_id,
            },
        });
        return {
            success: false,
            error: "Agent does not belong to the specified organization",
            code: "ORG_MISMATCH",
        };
    }

    // Verify agent is active
    if (!agent.is_active) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "agent",
            resourceId: agent_id,
            error: new Error("Agent is not active"),
            organizationId: organization_id,
        });
        return {
            success: false,
            error: "Agent is not active. Activate the agent before issuing a card.",
            code: "AGENT_INACTIVE",
        };
    }

    // Determine spending limit
    const spendLimitCents: CentsAmount =
        input.spend_limit_cents ?? agent.monthly_budget_cents;

    // Verify budget is configured
    if (spendLimitCents <= 0n) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "agent",
            resourceId: agent_id,
            error: new Error("No spending limit configured for agent"),
            organizationId: organization_id,
            metadata: {
                agent_budget: agent.monthly_budget_cents.toString(),
                requested_limit: input.spend_limit_cents?.toString(),
            },
        });
        return {
            success: false,
            error:
                "Agent has no monthly budget configured. Set a budget before issuing a card.",
            code: "NO_BUDGET_CONFIGURED",
        };
    }

    // -------------------------------------------------------------------------
    // STEP 2: Fetch and validate organization
    // -------------------------------------------------------------------------
    const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", organization_id)
        .single();

    if (orgError || !org) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "organization",
            resourceId: organization_id,
            error: orgError ?? new Error("Organization not found"),
        });
        return {
            success: false,
            error: `Organization not found: ${organization_id}`,
            code: "ORGANIZATION_NOT_FOUND",
        };
    }

    const organization = org as Organization;

    // Verify Stripe account is linked
    if (!organization.stripe_account_id) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "organization",
            resourceId: organization_id,
            error: new Error("Organization has no Stripe account linked"),
            metadata: { step: "stripe_account_check" },
        });
        return {
            success: false,
            error:
                "Organization has not completed Stripe Connect onboarding. Please complete onboarding first.",
            code: "STRIPE_ACCOUNT_MISSING",
        };
    }

    // Verify Stripe account is verified
    if (!organization.stripe_account_verified_at) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "organization",
            resourceId: organization_id,
            error: new Error("Stripe account not verified"),
            metadata: {
                stripe_account_id: organization.stripe_account_id,
                step: "stripe_verification_check",
            },
        });
        return {
            success: false,
            error:
                "Stripe Connect account is not yet verified. Please complete all verification requirements.",
            code: "ORG_NOT_VERIFIED",
        };
    }

    // -------------------------------------------------------------------------
    // STEP 3: Idempotency check - return existing active card if present
    // -------------------------------------------------------------------------
    const { data: existingCards, error: cardsError } = await supabase
        .from("virtual_cards")
        .select("*")
        .eq("agent_id", agent_id)
        .eq("is_active", true)
        .limit(1);

    if (cardsError) {
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "virtual_cards",
            error: cardsError,
            organizationId: organization_id,
            metadata: { agent_id, step: "idempotency_check" },
        });
        return {
            success: false,
            error: "Failed to check for existing cards",
            code: "DATABASE_ERROR",
        };
    }

    // If an active card already exists, return it (idempotent behavior)
    if (existingCards && existingCards.length > 0) {
        const existingCard = parseVirtualCard(existingCards[0] as VirtualCardRow);
        return {
            success: true,
            data: {
                card_id: existingCard.id,
                last4: existingCard.last4,
                exp_month: existingCard.exp_month,
                exp_year: existingCard.exp_year,
                brand: existingCard.brand,
                is_existing: true,
            },
        };
    }

    // -------------------------------------------------------------------------
    // STEP 4: Create Stripe Cardholder on CONNECTED ACCOUNT
    // -------------------------------------------------------------------------
    // Cardholders represent the "agent" in Stripe Issuing
    // CRITICAL: Use stripeAccount option to issue on connected account
    const stripeAccountId = organization.stripe_account_id;

    // Metadata for attribution (used in webhooks for rebilling)
    const stripeMetadata: Record<string, string> = {
        organization_id: organization_id,
        agent_id: agent_id,
        agent_name: agent.name,
        platform: "switchboard",
        created_at: new Date().toISOString(),
    };

    if (agent.client_id) {
        stripeMetadata.client_id = agent.client_id;
    }

    let cardholder: Stripe.Issuing.Cardholder;
    try {
        cardholder = await stripe.issuing.cardholders.create(
            {
                name: sanitizeCardholderName(agent.name),
                type: "individual",
                status: "active",
                billing: {
                    address: {
                        // Default address for virtual cardholders
                        line1: "Platform Agent",
                        city: "San Francisco",
                        state: "CA",
                        postal_code: "94102",
                        country: "US",
                    },
                },
                metadata: stripeMetadata,
            },
            {
                stripeAccount: stripeAccountId,
            }
        );
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Stripe cardholder creation failed");
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "stripe_cardholder",
            error,
            organizationId: organization_id,
            metadata: {
                agent_id,
                agent_name: agent.name,
                step: "create_cardholder",
            },
        });
        return {
            success: false,
            error: `Failed to create Stripe cardholder: ${error.message}`,
            code: "STRIPE_CARDHOLDER_ERROR",
        };
    }

    // -------------------------------------------------------------------------
    // STEP 5: Create Stripe Virtual Card on CONNECTED ACCOUNT
    // -------------------------------------------------------------------------

    // Convert BigInt to number for Stripe API (safe for typical spend limits)
    const spendLimitNumber = safeConvertToNumber(spendLimitCents);

    // Build spending controls
    const spendingControls: Stripe.Issuing.CardCreateParams.SpendingControls = {
        spending_limits: [
            {
                amount: spendLimitNumber,
                interval: "monthly",
            },
        ],
    };

    // Add category restrictions if specified
    if (allowed_categories && allowed_categories.length > 0) {
        spendingControls.allowed_categories =
            allowed_categories as Stripe.Issuing.CardCreateParams.SpendingControls.AllowedCategory[];
    }

    if (blocked_categories && blocked_categories.length > 0) {
        spendingControls.blocked_categories =
            blocked_categories as Stripe.Issuing.CardCreateParams.SpendingControls.BlockedCategory[];
    }

    let card: Stripe.Issuing.Card;
    try {
        card = await stripe.issuing.cards.create(
            {
                cardholder: cardholder.id,
                currency: "usd",
                type: "virtual",
                status: "active",
                spending_controls: spendingControls,
                metadata: stripeMetadata,
            },
            {
                stripeAccount: stripeAccountId,
            }
        );
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Stripe card creation failed");

        // Card creation failed - the cardholder was created but card wasn't
        // We don't need to clean up the cardholder (Stripe allows orphaned cardholders)
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "stripe_card",
            error,
            organizationId: organization_id,
            metadata: {
                agent_id,
                cardholder_id: cardholder.id,
                spend_limit_cents: spendLimitCents.toString(),
                step: "create_card",
            },
        });
        return {
            success: false,
            error: `Failed to create Stripe card: ${error.message}`,
            code: "STRIPE_CARD_ERROR",
        };
    }

    // -------------------------------------------------------------------------
    // STEP 6: Persist to virtual_cards table
    // -------------------------------------------------------------------------

    const virtualCardInsert: VirtualCardInsert = {
        id: card.id, // Stripe card ID as primary key
        agent_id: agent_id,
        organization_id: organization_id,
        stripe_cardholder_id: cardholder.id,
        last4: card.last4,
        brand: card.brand ?? "visa", // Default to visa for Stripe Issuing
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        spending_limit_cents: spendLimitCents,
        current_spend_cents: 0n,
        is_active: true,
        metadata: {
            stripe_metadata: stripeMetadata,
            created_via: "issueVirtualCardForAgent",
        },
    };

    // Serialize for database (converts BigInt to string)
    const serializedInsert = serializeVirtualCardInsert(virtualCardInsert);

    const { error: insertError } = await supabase
        .from("virtual_cards")
        .insert(serializedInsert);

    if (insertError) {
        // Critical: Card was created in Stripe but failed to persist locally
        // Log this as a critical error for investigation
        await logAuditError({
            action: "issue_virtual_card",
            resourceType: "virtual_cards",
            resourceId: card.id,
            error: insertError,
            organizationId: organization_id,
            metadata: {
                agent_id,
                cardholder_id: cardholder.id,
                stripe_card_id: card.id,
                step: "database_insert",
                critical: true,
                // Include card details for manual recovery if needed
                recovery_data: {
                    last4: card.last4,
                    exp_month: card.exp_month,
                    exp_year: card.exp_year,
                    brand: card.brand,
                },
            },
        });

        // Attempt to cancel the card in Stripe to maintain consistency
        try {
            await stripe.issuing.cards.update(
                card.id,
                { status: "canceled" },
                { stripeAccount: stripeAccountId }
            );
        } catch (cancelErr) {
            // Log but don't fail - we need to return the error to the caller
            console.error(
                "[CRITICAL] Failed to cancel orphaned Stripe card:",
                card.id,
                cancelErr
            );
        }

        return {
            success: false,
            error: `Failed to save card to database: ${insertError.message}`,
            code: "DATABASE_ERROR",
        };
    }

    // -------------------------------------------------------------------------
    // STEP 7: Log successful operation and return
    // -------------------------------------------------------------------------

    await logFinancialOperation({
        action: "issue_virtual_card",
        resourceType: "virtual_cards",
        resourceId: card.id,
        organizationId: organization_id,
        stateAfter: {
            card_id: card.id,
            agent_id: agent_id,
            cardholder_id: cardholder.id,
            spending_limit_cents: spendLimitCents.toString(),
            last4: card.last4,
        },
        reason: `Issued virtual card for agent: ${agent.name}`,
        metadata: {
            agent_name: agent.name,
            client_id: agent.client_id,
        },
    });

    return {
        success: true,
        data: {
            card_id: card.id,
            last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            brand: card.brand ?? "visa",
            is_existing: false,
        },
    };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sanitize agent name for use as cardholder name.
 * Stripe has specific requirements for cardholder names.
 *
 * @param name - Raw agent name
 * @returns Sanitized name for Stripe
 */
function sanitizeCardholderName(name: string): string {
    // Remove any characters that might cause issues
    // Stripe allows letters, spaces, hyphens, and apostrophes
    let sanitized = name.replace(/[^a-zA-Z0-9\s\-']/g, "");

    // Trim and collapse multiple spaces
    sanitized = sanitized.trim().replace(/\s+/g, " ");

    // Ensure minimum length (Stripe requires at least 1 character)
    if (sanitized.length === 0) {
        sanitized = "Agent";
    }

    // Truncate to max length (Stripe allows up to 255 characters)
    if (sanitized.length > 255) {
        sanitized = sanitized.substring(0, 255);
    }

    return sanitized;
}

/**
 * Safely convert BigInt cents to number for Stripe API.
 * Validates that the amount is within safe integer range.
 *
 * @param cents - Amount in cents as BigInt
 * @returns Amount as number
 * @throws Error if amount exceeds safe integer range
 */
function safeConvertToNumber(cents: CentsAmount): number {
    const num = Number(cents);

    if (num > Number.MAX_SAFE_INTEGER) {
        throw new Error(
            `Amount ${cents} exceeds safe integer range. Maximum is $${(
                Number.MAX_SAFE_INTEGER / 100
            ).toFixed(2)}`
        );
    }

    if (num < 0) {
        throw new Error("Amount cannot be negative");
    }

    return num;
}

// =============================================================================
// ADDITIONAL CARD OPERATIONS
// =============================================================================

/**
 * Get the virtual card details for an agent.
 * Returns the active card if one exists.
 *
 * @param agentId - Agent UUID
 * @returns Virtual card or null
 */
export async function getAgentVirtualCard(
    agentId: string
): Promise<VirtualCardRow | null> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from("virtual_cards")
        .select("*")
        .eq("agent_id", agentId)
        .eq("is_active", true)
        .single();

    if (error || !data) {
        return null;
    }

    return data as VirtualCardRow;
}

/**
 * Deactivate a virtual card.
 * Freezes the card in Stripe and marks as inactive in database.
 *
 * @param cardId - Stripe card ID
 * @param organizationId - Organization UUID (for audit logging and fetching stripe account)
 * @returns Success or error
 */
export async function deactivateVirtualCard(
    cardId: string,
    organizationId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceClient();
    const stripe = getStripeClient();

    try {
        // Fetch org's stripe_account_id for connected account operations
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("stripe_account_id")
            .eq("id", organizationId)
            .single();

        if (orgError || !org?.stripe_account_id) {
            throw new Error("Organization Stripe account not found");
        }

        // Freeze card in Stripe (on connected account)
        await stripe.issuing.cards.update(
            cardId,
            { status: "inactive" },
            { stripeAccount: org.stripe_account_id }
        );

        // Update database
        const { error } = await supabase
            .from("virtual_cards")
            .update({ is_active: false })
            .eq("id", cardId);

        if (error) {
            throw error;
        }

        await logFinancialOperation({
            action: "deactivate_virtual_card",
            resourceType: "virtual_cards",
            resourceId: cardId,
            organizationId,
            reason: "Card deactivated by user",
        });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "deactivate_virtual_card",
            resourceType: "virtual_cards",
            resourceId: cardId,
            error,
            organizationId,
        });
        return { success: false, error: error.message };
    }
}

/**
 * Update virtual card spending limit.
 *
 * @param cardId - Stripe card ID
 * @param newLimitCents - New monthly limit in cents
 * @param organizationId - Organization UUID (for audit logging and fetching stripe account)
 * @returns Success or error
 */
export async function updateCardSpendingLimit(
    cardId: string,
    newLimitCents: CentsAmount,
    organizationId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceClient();
    const stripe = getStripeClient();

    try {
        // Fetch org's stripe_account_id for connected account operations
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("stripe_account_id")
            .eq("id", organizationId)
            .single();

        if (orgError || !org?.stripe_account_id) {
            throw new Error("Organization Stripe account not found");
        }

        // Get current card for audit logging
        const { data: currentCard } = await supabase
            .from("virtual_cards")
            .select("spending_limit_cents")
            .eq("id", cardId)
            .single();

        const newLimitNumber = safeConvertToNumber(newLimitCents);

        // Update in Stripe (on connected account)
        await stripe.issuing.cards.update(
            cardId,
            {
                spending_controls: {
                    spending_limits: [
                        {
                            amount: newLimitNumber,
                            interval: "monthly",
                        },
                    ],
                },
            },
            { stripeAccount: org.stripe_account_id }
        );

        // Update in database
        const { error } = await supabase
            .from("virtual_cards")
            .update({ spending_limit_cents: newLimitCents.toString() })
            .eq("id", cardId);

        if (error) {
            throw error;
        }

        await logFinancialOperation({
            action: "update_card_spending_limit",
            resourceType: "virtual_cards",
            resourceId: cardId,
            organizationId,
            stateBefore: {
                spending_limit_cents: currentCard?.spending_limit_cents,
            },
            stateAfter: {
                spending_limit_cents: newLimitCents.toString(),
            },
            reason: "Spending limit updated",
        });

        return { success: true };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "update_card_spending_limit",
            resourceType: "virtual_cards",
            resourceId: cardId,
            error,
            organizationId,
            metadata: {
                new_limit_cents: newLimitCents.toString(),
            },
        });
        return { success: false, error: error.message };
    }
}
