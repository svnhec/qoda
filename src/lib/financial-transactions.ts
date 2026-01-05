/**
 * FINANCIAL TRANSACTION WRAPPERS
 * =============================================================================
 * CRITICAL: All money movements must be atomic and consistent.
 * Provides transaction wrappers that ensure ledger + balance updates happen together.
 * =============================================================================
 */

import { createServiceClient } from "@/lib/supabase/server";
import { addOrganizationFunds, deductOrganizationFunds, getOrganizationBalance } from "@/lib/balance";
import { createLedgerEntry } from "@/lib/db/ledger";
import { logFinancialOperation } from "@/lib/db/audit";
import type { CentsAmount } from "@/lib/types/currency";

export type FinancialTransactionResult =
  | { success: true; transactionId: string; newBalance: bigint }
  | { success: false; error: string };

/**
 * FUNDING TRANSACTION: Add money to organization balance
 * Creates transaction record + updates balance atomically
 */
export async function processFundingTransaction(params: {
  organizationId: string;
  amountCents: CentsAmount;
  stripeTransferId?: string;
  description?: string;
  userId?: string;
}): Promise<FinancialTransactionResult> {
  const supabase = createServiceClient();

  try {
    // Start transaction
    const { data: txData, error: txError } = await supabase.rpc("begin_transaction");

    if (txError) throw new Error(`Failed to begin transaction: ${txError.message}`);

    const transactionId = txData as string;

    try {
      // 1. Record funding transaction
      const { error: insertError } = await supabase
        .from("funding_transactions")
        .insert({
          organization_id: params.organizationId,
          amount_cents: String(params.amountCents),
          stripe_transfer_id: params.stripeTransferId || `funding_${Date.now()}`,
          status: 'pending',
          description: params.description || 'Funding transaction'
        });

      if (insertError) throw new Error(`Failed to record transaction: ${insertError.message}`);

      // 2. Update balance atomically
      const balanceResult = await addOrganizationFunds(params.organizationId, params.amountCents);

      if (!balanceResult.success) {
        throw new Error(`Balance update failed: ${balanceResult.error}`);
      }

      // 3. Mark transaction as succeeded
      await supabase
        .from("funding_transactions")
        .update({ status: 'succeeded' })
        .eq("stripe_transfer_id", params.stripeTransferId || `funding_${Date.now()}`);

      // 4. Commit transaction
      await supabase.rpc("commit_transaction", { p_transaction_group_id: transactionId });

      // 5. Log financial operation
      await logFinancialOperation({
        action: "funding_transaction",
        resourceType: "funding_transaction",
        resourceId: params.stripeTransferId || transactionId,
        userId: params.userId,
        organizationId: params.organizationId,
        stateBefore: { balance: balanceResult.newBalance - params.amountCents },
        stateAfter: { balance: balanceResult.newBalance },
        reason: params.description || "Organization funding",
      });

      return {
        success: true,
        transactionId,
        newBalance: balanceResult.newBalance
      };

    } catch (innerError) {
      // Rollback on any error
      await supabase.rpc("rollback_transaction", { p_transaction_group_id: transactionId });
      throw innerError;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Funding transaction failed:", message);

    return {
      success: false,
      error: message
    };
  }
}

/**
 * CARD TRANSACTION: Process card spend with ledger + balance updates
 * Creates debit entry + deducts from balance atomically
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

    // Start transaction
    const { data: txData, error: txError } = await supabase.rpc("begin_transaction");
    if (txError) throw new Error(`Failed to begin transaction: ${txError.message}`);

    const transactionGroupId = txData as string;

    try {
      // 1. Create ledger entry (debit expense, credit cash/balance)
      // This uses our existing atomic ledger functions
      const ledgerResult = await createLedgerEntry({
        debitAccountId: "expense_card_spend", // Would be actual account ID
        creditAccountId: "cash_organization", // Would be actual account ID
        amountCents: params.amountCents,
        description: `Card spend: ${params.merchantName || 'Unknown merchant'}`,
        metadata: {
          agent_id: params.agentId,
          card_id: params.cardId,
          merchant_name: params.merchantName,
          merchant_category: params.merchantCategory,
          transaction_id: params.transactionId,
        },
        createdBy: params.userId,
      });

      if (!ledgerResult.success) {
        throw new Error(`Ledger entry failed: ${ledgerResult.error}`);
      }

      // 2. Deduct from balance atomically
      const balanceResult = await deductOrganizationFunds(params.organizationId, params.amountCents);

      if (!balanceResult.success) {
        throw new Error(`Balance deduction failed: ${balanceResult.error}`);
      }

      // 3. Record transaction settlement
      await supabase
        .from("transaction_settlements")
        .insert({
          organization_id: params.organizationId,
          agent_id: params.agentId,
          card_id: params.cardId,
          amount_cents: String(params.amountCents),
          merchant_name: params.merchantName,
          merchant_category: params.merchantCategory,
          transaction_id: params.transactionId,
          status: 'settled',
          settled_at: new Date().toISOString(),
        });

      // 4. Commit transaction
      await supabase.rpc("commit_transaction", { p_transaction_group_id: transactionGroupId });

      // 5. Log financial operation
      await logFinancialOperation({
        action: "card_transaction",
        resourceType: "transaction_settlement",
        resourceId: params.transactionId,
        userId: params.userId,
        organizationId: params.organizationId,
        stateBefore: { balance: balanceResult.newBalance + params.amountCents },
        stateAfter: { balance: balanceResult.newBalance },
        reason: `Card spend at ${params.merchantName || 'merchant'}`,
      });

      return {
        success: true,
        transactionId: transactionGroupId,
        newBalance: balanceResult.newBalance
      };

    } catch (innerError) {
      // Rollback on any error
      await supabase.rpc("rollback_transaction", { p_transaction_group_id: transactionGroupId });
      throw innerError;
    }

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
