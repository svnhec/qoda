/**
 * SWITCHBOARD LEDGER UTILITIES
 * =============================================================================
 * Functions for interacting with the double-entry ledger.
 * All operations go through the database function `record_transaction`
 * which enforces the balanced debit/credit invariant.
 * =============================================================================
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { CentsAmount } from "@/lib/types/currency";
import type {
  Database,
  JournalEntryMetadata,
  JournalEntry,
  JournalEntryRow,
  parseJournalEntry,
  ChartOfAccount,
  SYSTEM_ACCOUNT_CODES,
} from "./types";

// Re-export types for convenience
export type { JournalEntryMetadata, JournalEntry, ChartOfAccount };
export { SYSTEM_ACCOUNT_CODES } from "./types";

/**
 * Result of a ledger operation.
 */
export type LedgerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a ledger entry (double-entry transaction).
 * This is the primary function for recording financial transactions.
 *
 * CRITICAL: This function uses the service role client to bypass RLS
 * for system-level operations. Only call from trusted server-side code.
 *
 * @param params.debitAccountId - Account to debit (increase assets/expenses, decrease liabilities/equity/revenue)
 * @param params.creditAccountId - Account to credit (decrease assets/expenses, increase liabilities/equity/revenue)
 * @param params.amountCents - Amount in cents as BigInt (must be positive)
 * @param params.description - Description of the transaction
 * @param params.metadata - Additional metadata (stripe IDs, agent IDs, etc.)
 * @param params.createdBy - User ID who initiated the transaction
 * @returns Transaction group ID on success
 *
 * @example
 * ```typescript
 * // Record an agency deposit: $100 from agency to platform
 * const result = await createLedgerEntry({
 *   debitAccountId: platformCashAccountId,     // Asset increases (debit)
 *   creditAccountId: agencyDepositsAccountId,  // Liability increases (credit)
 *   amountCents: 10000n,  // $100.00
 *   description: "Agency deposit",
 *   metadata: {
 *     stripe_payment_intent_id: "pi_xxx",
 *     idempotency_key: "deposit_agency123_1234567890"
 *   }
 * });
 * ```
 */
export async function createLedgerEntry(params: {
  debitAccountId: string;
  creditAccountId: string;
  amountCents: CentsAmount;
  description?: string;
  metadata?: JournalEntryMetadata;
  createdBy?: string;
}): Promise<LedgerResult<{ transactionGroupId: string }>> {
  const {
    debitAccountId,
    creditAccountId,
    amountCents,
    description,
    metadata = {},
    createdBy,
  } = params;

  // Validate amount
  if (amountCents <= 0n) {
    return {
      success: false,
      error: `Amount must be positive. Got: ${amountCents}`,
    };
  }

  try {
    const supabase = createServiceClient();

    // Call the database function that enforces double-entry invariants
    const { data, error } = await supabase.rpc("record_transaction", {
      p_debit_account_id: debitAccountId,
      p_credit_account_id: creditAccountId,
      p_amount_cents: amountCents.toString(),
      p_description: description ?? null,
      p_metadata: metadata,
      p_created_by: createdBy ?? null,
    });

    if (error) {
      console.error("Ledger entry failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: { transactionGroupId: data as string },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Ledger entry exception:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get the balance of an account.
 *
 * @param accountId - Account UUID
 * @param asOf - Optional timestamp to get historical balance
 * @returns Balance in cents as BigInt
 */
export async function getAccountBalance(
  accountId: string,
  asOf?: Date
): Promise<LedgerResult<CentsAmount>> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("get_account_balance", {
      p_account_id: accountId,
      p_as_of: asOf?.toISOString() ?? new Date().toISOString(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: BigInt(data as string),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get a system account by its code.
 *
 * @param code - Account code from SYSTEM_ACCOUNT_CODES
 * @returns Account details
 */
export async function getSystemAccount(
  code: string
): Promise<LedgerResult<ChartOfAccount>> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("*")
      .eq("code", code)
      .is("organization_id", null)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ChartOfAccount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Commit a pending transaction, making it immutable.
 *
 * @param transactionGroupId - Transaction group UUID
 */
export async function commitTransaction(
  transactionGroupId: string
): Promise<LedgerResult<void>> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.rpc("commit_transaction", {
      p_transaction_group_id: transactionGroupId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get all journal entries for a transaction.
 *
 * @param transactionGroupId - Transaction group UUID
 * @returns Array of journal entries
 */
export async function getTransactionEntries(
  transactionGroupId: string
): Promise<LedgerResult<JournalEntry[]>> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("transaction_group_id", transactionGroupId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // Convert BigInt amounts
    const entries = (data as JournalEntryRow[]).map((row) => ({
      ...row,
      amount: BigInt(row.amount),
    }));

    return { success: true, data: entries };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Verify that a transaction is balanced (sum of entries = 0).
 *
 * @param transactionGroupId - Transaction group UUID
 * @returns true if balanced
 */
export async function verifyTransactionBalanced(
  transactionGroupId: string
): Promise<LedgerResult<boolean>> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("verify_transaction_balanced", {
      p_transaction_group_id: transactionGroupId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as boolean };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get account entries with pagination.
 *
 * @param accountId - Account UUID
 * @param options - Pagination and filter options
 * @returns Paginated journal entries
 */
export async function getAccountEntries(
  accountId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: "pending" | "committed" | "settled";
    fromDate?: Date;
    toDate?: Date;
  } = {}
): Promise<LedgerResult<{ entries: JournalEntry[]; total: number }>> {
  const { limit = 50, offset = 0, status, fromDate, toDate } = options;

  try {
    const supabase = createServiceClient();

    let query = supabase
      .from("journal_entries")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("posting_status", status);
    }
    if (fromDate) {
      query = query.gte("created_at", fromDate.toISOString());
    }
    if (toDate) {
      query = query.lte("created_at", toDate.toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const entries = (data as JournalEntryRow[]).map((row) => ({
      ...row,
      amount: BigInt(row.amount),
    }));

    return {
      success: true,
      data: { entries, total: count ?? 0 },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Generate an idempotency key for a transaction.
 * Use this to prevent duplicate transactions from webhooks.
 *
 * @param prefix - Key prefix (e.g., "stripe_webhook", "rebill")
 * @param uniqueId - Unique identifier (e.g., Stripe event ID)
 * @returns Formatted idempotency key
 */
export function generateIdempotencyKey(prefix: string, uniqueId: string): string {
  return `${prefix}_${uniqueId}`;
}

