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
  JournalEntryMetadata,
  JournalEntry,
  JournalEntryRow,
  ChartOfAccount,
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

/**
 * Entry for a multi-entry transaction.
 */
export interface TransactionEntry {
  /** Account code (from SYSTEM_ACCOUNT_CODES) */
  accountCode: string;
  /** Debit amount in cents (must be 0 if credit is set) */
  debit: CentsAmount;
  /** Credit amount in cents (must be 0 if debit is set) */
  credit: CentsAmount;
}

/**
 * Result of recording a transaction.
 */
export interface RecordTransactionResult {
  success: boolean;
  journalEntryId?: string;
  error?: string;
}

/**
 * Record a multi-entry balanced transaction.
 * 
 * This is a higher-level function that:
 * - Takes account codes instead of IDs
 * - Supports multiple entries (for complex transactions)
 * - Validates that debits = credits (balanced transaction)
 * - Returns the journal entry ID for reference
 * 
 * @param params - Transaction parameters
 * @returns Result with journal entry ID on success
 * 
 * @example
 * ```typescript
 * const result = await recordTransaction({
 *   organizationId: 'org_123',
 *   description: 'Card purchase at vendor',
 *   metadata: { stripe_transaction_id: 'txn_xxx' },
 *   entries: [
 *     { accountCode: '5100', debit: 1000n, credit: 0n },  // Expense
 *     { accountCode: '1100', debit: 0n, credit: 1000n },  // Bank
 *   ]
 * });
 * ```
 */
export async function recordTransaction(params: {
  organizationId: string;
  description: string;
  metadata?: JournalEntryMetadata;
  entries: TransactionEntry[];
}): Promise<RecordTransactionResult> {
  const { organizationId, description, metadata = {}, entries } = params;

  // Validate entries
  if (entries.length < 2) {
    return {
      success: false,
      error: "At least two entries are required for a balanced transaction",
    };
  }

  // Calculate totals
  let totalDebits = 0n;
  let totalCredits = 0n;

  for (const entry of entries) {
    if (entry.debit < 0n || entry.credit < 0n) {
      return {
        success: false,
        error: "Debit and credit amounts must be non-negative",
      };
    }
    if (entry.debit > 0n && entry.credit > 0n) {
      return {
        success: false,
        error: "An entry cannot have both debit and credit amounts",
      };
    }
    totalDebits += entry.debit;
    totalCredits += entry.credit;
  }

  // Validate balanced transaction
  if (totalDebits !== totalCredits) {
    return {
      success: false,
      error: `Transaction is not balanced: debits=${totalDebits}, credits=${totalCredits}`,
    };
  }

  if (totalDebits === 0n) {
    return {
      success: false,
      error: "Transaction must have non-zero amounts",
    };
  }

  try {
    const supabase = createServiceClient();

    // Look up account IDs from codes
    const accountCodes = [...new Set(entries.map(e => e.accountCode))];
    const { data: accounts, error: accountError } = await supabase
      .from("chart_of_accounts")
      .select("id, code")
      .in("code", accountCodes);

    if (accountError || !accounts) {
      return {
        success: false,
        error: `Failed to look up accounts: ${accountError?.message || "Unknown error"}`,
      };
    }

    // Create code → id mapping
    const codeToId = new Map<string, string>();
    for (const acc of accounts) {
      codeToId.set(acc.code, acc.id);
    }

    // Verify all codes were found
    for (const code of accountCodes) {
      if (!codeToId.has(code)) {
        return {
          success: false,
          error: `Account with code '${code}' not found`,
        };
      }
    }

    // For a simple 2-entry transaction, use existing createLedgerEntry
    if (entries.length === 2) {
      const debitEntry = entries.find(e => e.debit > 0n);
      const creditEntry = entries.find(e => e.credit > 0n);

      if (debitEntry && creditEntry) {
        const debitAccountId = codeToId.get(debitEntry.accountCode)!;
        const creditAccountId = codeToId.get(creditEntry.accountCode)!;

        const result = await createLedgerEntry({
          debitAccountId,
          creditAccountId,
          amountCents: debitEntry.debit,
          description,
          metadata: {
            ...metadata,
            organization_id: organizationId,
          },
        });

        if (result.success) {
          return {
            success: true,
            journalEntryId: result.data.transactionGroupId,
          };
        } else {
          return {
            success: false,
            error: result.error,
          };
        }
      }
    }

    // For complex multi-entry transactions, we need to insert directly
    // First, create a transaction group
    const transactionGroupId = crypto.randomUUID();
    const now = new Date().toISOString();

    const journalEntries = entries.map(entry => ({
      transaction_group_id: transactionGroupId,
      account_id: codeToId.get(entry.accountCode)!,
      // Debits are positive, credits are negative in double-entry
      amount: (entry.debit > 0n ? entry.debit : -entry.credit).toString(),
      posting_status: "pending" as const,
      description,
      metadata: {
        ...metadata,
        organization_id: organizationId,
      },
      created_at: now,
      updated_at: now,
    }));

    const { error: insertError } = await supabase
      .from("journal_entries")
      .insert(journalEntries);

    if (insertError) {
      return {
        success: false,
        error: `Failed to insert journal entries: ${insertError.message}`,
      };
    }

    return {
      success: true,
      journalEntryId: transactionGroupId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("recordTransaction exception:", message);
    return {
      success: false,
      error: message,
    };
  }
}
