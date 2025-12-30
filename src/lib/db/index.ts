/**
 * SWITCHBOARD DATABASE MODULE
 * =============================================================================
 * Re-exports all database-related types and utilities.
 * =============================================================================
 */

// Types
export * from "./types";

// Ledger operations
export {
  createLedgerEntry,
  getAccountBalance,
  getSystemAccount,
  commitTransaction,
  getTransactionEntries,
  verifyTransactionBalanced,
  getAccountEntries,
  generateIdempotencyKey,
  SYSTEM_ACCOUNT_CODES,
  type LedgerResult,
  type JournalEntry,
  type JournalEntryMetadata,
  type ChartOfAccount,
} from "./ledger";

// Audit logging
export {
  logAudit,
  logAuditError,
  logFinancialOperation,
  logApiRequest,
  logWebhookEvent,
} from "./audit";

