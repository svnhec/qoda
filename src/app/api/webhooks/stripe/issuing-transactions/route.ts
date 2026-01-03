/**
 * POST /api/webhooks/stripe/issuing-transactions
 * =============================================================================
 * Handles Stripe Issuing transaction settlement events.
 *
 * Event: issuing_transaction.created
 *
 * Flow:
 * 1. Verify webhook signature
 * 2. Extract transaction details
 * 3. Idempotency check (skip if already processed)
 * 4. Query card → agent → client → organization
 * 5. Calculate markup (organization.markup_percentage)
 * 6. Create double-entry ledger transactions
 * 7. Insert into transaction_settlements
 * 8. Update agent.current_spend_cents
 * 9. Return 200 OK
 *
 * Per .cursorrules:
 * - All financial operations use double-entry bookkeeping
 * - All monetary values as BigInt (cents)
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { logAuditError, logFinancialOperation } from "@/lib/db/audit";
import { validateWebhookSignature, applyRateLimit, RATE_LIMITS } from "@/lib/security";
import { recordTransaction } from "@/lib/db/ledger";
import Stripe from "stripe";

// Environment variables
const WEBHOOK_SECRET =
    process.env.STRIPE_ISSUING_TXN_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET;
const ENABLE_STRIPE_ISSUING = process.env.ENABLE_STRIPE_ISSUING === "true";

export async function POST(request: NextRequest) {
    // Check if Stripe Issuing is enabled
    if (!ENABLE_STRIPE_ISSUING) {
        console.warn("Stripe Issuing disabled - ignoring transaction webhook");
        return NextResponse.json({ received: true, disabled: true });
    }

    // Rate limiting for webhooks
    const rateLimited = applyRateLimit(request, "webhook:issuing-txn", RATE_LIMITS.WEBHOOK);
    if (rateLimited) return rateLimited;

    let rawBody: string;
    let event: Stripe.Event;

    // -------------------------------------------------------------------------
    // STEP 1: Verify webhook signature
    // -------------------------------------------------------------------------
    try {
        rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            return NextResponse.json(
                { error: "Missing Stripe-Signature header" },
                { status: 400 }
            );
        }

        if (!WEBHOOK_SECRET) {
            console.error("STRIPE_ISSUING_TXN_WEBHOOK_SECRET not configured");
            return NextResponse.json(
                { error: "Webhook not configured" },
                { status: 500 }
            );
        }

        event = validateWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Signature verification failed");
        console.error("Webhook signature error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Only handle issuing_transaction.created events
    if (event.type !== "issuing_transaction.created") {
        return NextResponse.json({ received: true });
    }

    // -------------------------------------------------------------------------
    // STEP 2: Extract transaction details
    // -------------------------------------------------------------------------
    const transaction = event.data.object as Stripe.Issuing.Transaction;

    const transactionId = transaction.id;
    const authorizationId = transaction.authorization || null;
    const amountCents = BigInt(Math.abs(transaction.amount)); // Stripe sends negative for purchases
    const cardId = typeof transaction.card === "string" ? transaction.card : transaction.card.id;
    const merchantName = transaction.merchant_data?.name || "Unknown Merchant";
    const merchantCategory = transaction.merchant_data?.category || "";
    const merchantCity = transaction.merchant_data?.city || "";
    const merchantCountry = transaction.merchant_data?.country || "US";

    const supabase = createServiceClient();

    // -------------------------------------------------------------------------
    // STEP 3: Query card → agent → client → organization
    // -------------------------------------------------------------------------
    let clientId: string | null = null;
    let markupBasisPoints = 1500n; // Default 1500 basis points = 15%

    // Get card and agent info
    const { data: cardData, error: cardError } = await supabase
        .from("virtual_cards")
        .select(`
    agent_id,
    organization_id,
    agents!inner (
      id,
      client_id,
      current_spend_cents
    )
  `)
        .eq("id", cardId)
        .single();

    if (cardError || !cardData) {
        const error = cardError || new Error(`Card not found: ${cardId}`);
        await logAuditError({
            action: "issuing_transaction_settlement",
            resourceType: "virtual_card",
            resourceId: cardId,
            error,
            metadata: { stripe_transaction_id: transactionId },
        });
        return NextResponse.json(
            { error: "Card not found" },
            { status: 400 }
        );
    }

    const agentId = cardData.agent_id;
    const organizationId = cardData.organization_id;

    // Extract client_id from nested agent
    const agent = cardData.agents as unknown as {
        id: string;
        client_id: string | null;
        current_spend_cents: string;
    };
    clientId = agent?.client_id || null;

    // Get markup basis points from organization
    const { data: orgData } = await supabase
        .from("organizations")
        .select("markup_basis_points")
        .eq("id", organizationId)
        .single();

    if (orgData?.markup_basis_points) {
        markupBasisPoints = BigInt(orgData.markup_basis_points);
    }

    // Calculate markup
    const markupFeeCents = (amountCents * markupBasisPoints + 5000n) / 10000n;
    const totalRebillCents = amountCents + markupFeeCents;

    // -------------------------------------------------------------------------
    // STEP 4: Try to insert settlement record (idempotent claim)
    // -------------------------------------------------------------------------
    // Use INSERT with ON CONFLICT DO NOTHING to claim this transaction atomically
    let settlementId: string;
    try {
        const { data: settlement, error: insertError } = await supabase
            .from("transaction_settlements")
            .insert({
                stripe_transaction_id: transactionId,
                stripe_authorization_id: authorizationId,
                card_id: cardId,
                agent_id: agentId,
                organization_id: organizationId,
                client_id: clientId,
                amount_cents: amountCents.toString(),
                markup_fee_cents: markupFeeCents.toString(),
                currency: "usd",
                merchant_name: merchantName,
                merchant_category: merchantCategory,
                merchant_city: merchantCity,
                merchant_country: merchantCountry,
                metadata: {
                    stripe_event_id: event.id,
                    processed_at: new Date().toISOString(),
                },
            })
            .select("id")
            .single();

        if (insertError) {
            // Check if it's a duplicate (already processed by another instance)
            if (insertError.code === "23505") { // unique_violation
                // Recover existing settlement ID to check/resume state
                const { data: existing } = await supabase
                    .from("transaction_settlements")
                    .select("id, spend_journal_entry_id")
                    .eq("stripe_transaction_id", transactionId)
                    .single();

                if (existing?.spend_journal_entry_id) {
                    console.warn(`Transaction ${transactionId} already processed, skipping`);
                    return NextResponse.json({ received: true, already_processed: true });
                }

                if (!existing) throw insertError; // Should not happen given 23505

                console.warn(`Resuming processing for incomplete transaction ${transactionId}`);
                settlementId = existing.id;
            } else {
                throw insertError;
            }
        } else {
            settlementId = settlement.id;
        }
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to insert settlement");
        await logAuditError({
            action: "issuing_transaction_settlement",
            resourceType: "transaction_settlements",
            resourceId: transactionId,
            error,
            organizationId,
            metadata: { step: "insert_settlement" },
        });
        return NextResponse.json(
            { error: "Failed to process settlement" },
            { status: 500 }
        );
    }

    // -------------------------------------------------------------------------
    // STEP 6: Double-entry ledger transactions
    // -------------------------------------------------------------------------
    let spendJournalEntryId: string | null = null;
    let markupJournalEntryId: string | null = null;

    try {
        // First, get or create the necessary accounts
        // For MVP, we'll use a simplified account structure
        // In production, each org/client would have their own accounts

        // Entry 1: Record the transaction spend
        // Debit: Agency Operating Account (expense)
        // Credit: Platform Bank Account (asset - the card spent from platform funds)
        const spendEntry = await recordTransaction({
            organizationId,
            description: `Settled: ${merchantName}`,
            metadata: {
                stripe_transaction_id: transactionId,
                idempotency_key: `settle_spend_${transactionId}`,
                stripe_authorization_id: authorizationId ?? undefined,
                agent_id: agentId,
                client_id: clientId ?? undefined,
                merchant_name: merchantName,
                merchant_category: merchantCategory,
            },
            entries: [
                {
                    accountCode: "5100", // Cost of Services (expense)
                    debit: amountCents,
                    credit: 0n,
                },
                {
                    accountCode: "1100", // Platform Bank (asset)
                    debit: 0n,
                    credit: amountCents,
                },
            ],
        });

        if (spendEntry.success && spendEntry.journalEntryId) {
            spendJournalEntryId = spendEntry.journalEntryId;
        }

        // Entry 2: Record the markup revenue (if client exists and has a subscription)
        if (clientId && markupFeeCents > 0n) {
            const markupEntry = await recordTransaction({
                organizationId,
                description: `Markup ${(Number(markupBasisPoints) / 100).toFixed(1)}%: ${merchantName}`,
                metadata: {
                    stripe_transaction_id: transactionId,
                    client_id: clientId,
                    idempotency_key: `settle_markup_${transactionId}`,
                    base_amount_cents: amountCents.toString(),
                    markup_basis_points: markupBasisPoints.toString(),
                },
                entries: [
                    {
                        accountCode: "1200", // Client Accounts Receivable (asset)
                        debit: markupFeeCents,
                        credit: 0n,
                    },
                    {
                        accountCode: "4100", // Revenue from Services (revenue)
                        debit: 0n,
                        credit: markupFeeCents,
                    },
                ],
            });

            if (markupEntry.success && markupEntry.journalEntryId) {
                markupJournalEntryId = markupEntry.journalEntryId;
            }
        }
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Ledger entry failed");
        console.error("Failed to create ledger entries:", error.message);

        await logAuditError({
            action: "issuing_transaction_ledger",
            resourceType: "journal_entry",
            resourceId: transactionId,
            organizationId,
            error,
            metadata: {
                amount_cents: amountCents.toString(),
                markup_fee_cents: markupFeeCents.toString(),
            },
        });

        // Return 500 to trigger Stripe retry
        return NextResponse.json(
            { error: "Failed to record ledger entries" },
            { status: 500 }
        );
    }

    // -------------------------------------------------------------------------
    // STEP 7: Update settlement with journal entry IDs
    // -------------------------------------------------------------------------
    try {
        // Update settlement with journal entry IDs
        const { error: updateError } = await supabase
            .from("transaction_settlements")
            .update({
                spend_journal_entry_id: spendJournalEntryId,
                markup_journal_entry_id: markupJournalEntryId,
                billed_at: null, // Not yet billed
            })
            .eq("id", settlementId);

        if (updateError) {
            console.error("Failed to update settlement with journal entries:", updateError);
            // Log but continue - settlement record exists
            await logAuditError({
                action: "issuing_transaction_settlement",
                resourceType: "transaction_settlements",
                resourceId: settlementId,
                error: updateError,
                organizationId,
                metadata: { step: "update_journal_entries" },
            });
        }
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update settlement");
        console.error("Failed to update settlement:", error.message);
        // Log but continue
    }

    // -------------------------------------------------------------------------
    // STEP 8: Update agent.current_spend_cents atomically
    // -------------------------------------------------------------------------
    try {
        // Use RPC to atomically increment spend (prevents race conditions)
        const { data: newSpend, error: updateError } = await supabase.rpc("increment_agent_spend", {
            p_agent_id: agentId,
            p_amount_cents: amountCents.toString(),
        });

        if (updateError) {
            throw updateError;
        }

        console.warn(`Updated agent ${agentId} spend to ${newSpend} cents`);
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to update agent spend");
        console.error("Failed to update agent spend:", error.message);

        // Log error but don't fail the webhook - ledger entries are already created
        await logAuditError({
            action: "issuing_transaction_settlement",
            resourceType: "agent",
            resourceId: agentId,
            error,
            organizationId,
            metadata: {
                transaction_id: transactionId,
                amount_cents: amountCents.toString(),
                step: "update_agent_spend",
            },
        });
    }

    // -------------------------------------------------------------------------
    // STEP 9: Log success and return
    // -------------------------------------------------------------------------
    await logFinancialOperation({
        action: "issuing_transaction_settled",
        resourceType: "transaction_settlements",
        resourceId: transactionId,
        organizationId,
        stateAfter: {
            amount_cents: amountCents.toString(),
            markup_fee_cents: markupFeeCents.toString(),
            total_rebill_cents: totalRebillCents.toString(),
            agent_id: agentId,
            client_id: clientId,
            merchant_name: merchantName,
        },
        reason: `Transaction settled: ${merchantName}`,
    });

    return NextResponse.json({
        received: true,
        processed: true,
        settlement: {
            transaction_id: transactionId,
            amount_cents: amountCents.toString(),
            markup_fee_cents: markupFeeCents.toString(),
        },
    });
}
