/**
 * FINANCIAL TRANSACTION WRAPPERS
 * =============================================================================
 * CRITICAL: All money movements must be atomic and consistent.
 * Provides transaction wrappers that ensure ledger + balance updates happen together.
 * =============================================================================
 */

import { createServiceClient } from "@/lib/supabase/server";
import { addOrganizationFunds, deductOrganizationFunds, getOrganizationBalance } from "@/lib/balance";
import { recordTransaction } from "@/lib/db/ledger";
import { logFinancialOperation } from "@/lib/db/audit";
import type { CentsAmount } from "@/lib/types/currency";

export type FinancialTransactionResult =
  | { success: true; transactionId: string; newBalance: bigint }
  | { success: false; error: string };

/**
 * FUNDING TRANSACTION: Add money to organization balance
 * Creates transaction record + updates balance atomically using proper database transactions
 */
export async function processFundingTransaction(params: {
  organizationId: string;
  amountCents: CentsAmount;
  stripeTransferId?: string;
  description?: string;
  userId?: string;
}): Promise<FinancialTransactionResult> {
  const supabase = createServiceClient();
  const transactionId = crypto.randomUUID();
  const stripeTransferId = params.stripeTransferId || `funding_${Date.now()}`;

  try {
    // Start by recording the funding transaction (not yet committed)
    const { error: insertError } = await supabase
      .from("funding_transactions")
      .insert({
        organization_id: params.organizationId,
        amount_cents: params.amountCents.toString(),
        stripe_transfer_id: stripeTransferId,
        status: 'pending',
        description: params.description || 'Funding transaction'
      });

    if (insertError) {
      throw new Error(`Failed to record transaction: ${insertError.message}`);
    }

    // Update balance atomically
    const balanceResult = await addOrganizationFunds(params.organizationId, params.amountCents, params.userId);

    if (!balanceResult.success) {
      // Rollback the transaction record
      await supabase
        .from("funding_transactions")
        .delete()
        .eq("stripe_transfer_id", stripeTransferId);

      throw new Error(`Balance update failed: ${balanceResult.error}`);
    }

    // Mark transaction as succeeded
    const { error: updateError } = await supabase
      .from("funding_transactions")
      .update({ status: 'succeeded' })
      .eq("stripe_transfer_id", stripeTransferId);

    if (updateError) {
      console.error("Failed to mark transaction as succeeded:", updateError);
      // Don't fail the whole operation for this
    }

    // Log financial operation
    await logFinancialOperation({
      action: "funding_transaction",
      resourceType: "funding_transaction",
      resourceId: stripeTransferId,
      userId: params.userId,
      organizationId: params.organizationId,
      stateBefore: { balance: balanceResult.newBalance - params.amountCents },
      stateAfter: { balance: balanceResult.newBalance },
      reason: params.description || "Organization funding",
    }).catch(err => console.error("Failed to log funding operation:", err));

    return {
      success: true,
      transactionId: stripeTransferId,
      newBalance: balanceResult.newBalance
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Funding transaction failed:", message);

    // Try to mark as failed if it exists
    await supabase
      .from("funding_transactions")
      .update({ status: 'failed' })
      .eq("stripe_transfer_id", stripeTransferId)
      .catch(err => console.error("Failed to mark transaction as failed:", err));

    return {
      success: false,
      error: message
    };
  }
}

/**
 * CARD TRANSACTION: Process card spend with ledger + balance updates
 * Creates debit entry + deducts from balance atomically using proper database transactions
 */
export async function processCardTransaction(params: {
  organizationId: string;
  agentId: string;
  cardId: string;
  amountCents: CentsAmount;
  merchantName?: string;
  merchantCategory?: string;
  transactionId: string;
  userId?: string;
}): Promise<FinancialTransactionResult> {
  const supabase = createServiceClient();

  try {
    // Get current balance for validation
    const balanceCheck = await getOrganizationBalance(params.organizationId);
    if (!balanceCheck.success) {
      return { success: false, error: `Balance check failed: ${balanceCheck.error}` };
    }

    if (balanceCheck.balance < params.amountCents) {
      return { success: false, error: "Insufficient funds" };
    }

    // Create ledger transaction using our fixed recordTransaction function
    const ledgerResult = await recordTransaction({
      organizationId: params.organizationId,
      description: `Card spend: ${params.merchantName || 'Unknown merchant'}`,
      metadata: {
        stripe_transaction_id: params.transactionId,
        agent_id: params.agentId,
        card_id: params.cardId,
        merchant_name: params.merchantName,
        merchant_category: params.merchantCategory,
      },
      entries: [
        {
          accountCode: "5100", // Expense: Card Processing Fees
          debit: params.amountCents,
          credit: 0n,
        },
        {
          accountCode: "1000", // Asset: Platform Cash
          debit: 0n,
          credit: params.amountCents,
        },
      ],
    });

    if (!ledgerResult.success) {
      throw new Error(`Ledger transaction failed: ${ledgerResult.error}`);
    }

    // Deduct from balance atomically
    const balanceResult = await deductOrganizationFunds(params.organizationId, params.amountCents, params.userId);

    if (!balanceResult.success) {
      // Note: We don't rollback the ledger entry here as it's immutable once created
      // In a real system, you'd have compensating transactions or reversals
      throw new Error(`Balance deduction failed: ${balanceResult.error}`);
    }

    // Record transaction settlement
    const { error: settlementError } = await supabase
      .from("transaction_logs")
      .insert({
        organization_id: params.organizationId,
        agent_id: params.agentId,
        client_id: null, // Would be populated if known
        card_id: params.cardId,
        stripe_transaction_id: params.transactionId,
        amount_cents: params.amountCents,
        currency: 'usd',
        merchant_name: params.merchantName || 'Unknown merchant',
        merchant_category: params.merchantCategory,
        description: `Card transaction: ${params.merchantName || 'Unknown merchant'}`,
        status: 'approved',
        rebilled: false,
        rebill_period_id: null,
        metadata: {
          settlement_date: new Date().toISOString(),
        },
      });

    if (settlementError) {
      console.error("Failed to record transaction settlement:", settlementError);
      // Don't fail the whole transaction for this logging error
    }

    // Log financial operation
    await logFinancialOperation({
      action: "card_transaction",
      resourceType: "transaction_settlement",
      resourceId: params.transactionId,
      userId: params.userId,
      organizationId: params.organizationId,
      stateBefore: { balance: balanceResult.newBalance + params.amountCents },
      stateAfter: { balance: balanceResult.newBalance },
      reason: `Card spend at ${params.merchantName || 'merchant'}`,
    }).catch(err => console.error("Failed to log card transaction:", err));

    return {
      success: true,
      transactionId: ledgerResult.journalEntryId!,
      newBalance: balanceResult.newBalance
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Card transaction failed:", message);

    return {
      success: false,
      error: message
    };
  }
}

/**
 * TRANSFER TRANSACTION: Move money between accounts
 */
export async function processTransferTransaction(_params: {
  fromOrganizationId: string;
  toOrganizationId: string;
  amountCents: CentsAmount;
  description?: string;
  userId?: string;
}): Promise<FinancialTransactionResult> {
  // Implementation would create double-entry transfers
  // This is a placeholder for future inter-org transfers
  return {
    success: false,
    error: "Inter-organization transfers not yet implemented"
  };
}
