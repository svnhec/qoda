/**
 * SWITCHBOARD DATABASE TYPES
 * =============================================================================
 * TypeScript types matching the Supabase schema.
 * Generated from: supabase/migrations/001_ledger_schema.sql
 * =============================================================================
 */

import type { CentsAmount } from "@/lib/types/currency";

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type PostingStatus = "pending" | "committed" | "settled";

// -----------------------------------------------------------------------------
// ORGANIZATIONS
// -----------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInsert {
  id?: string;
  name: string;
  slug: string;
  stripe_customer_id?: string | null;
  stripe_account_id?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface OrganizationUpdate {
  name?: string;
  slug?: string;
  stripe_customer_id?: string | null;
  stripe_account_id?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// CHART OF ACCOUNTS
// -----------------------------------------------------------------------------

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  description: string | null;
  organization_id: string | null;
  normal_balance_debit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccountInsert {
  id?: string;
  code: string;
  name: string;
  account_type: AccountType;
  description?: string | null;
  organization_id?: string | null;
  normal_balance_debit: boolean;
  is_active?: boolean;
}

export interface ChartOfAccountUpdate {
  code?: string;
  name?: string;
  account_type?: AccountType;
  description?: string | null;
  normal_balance_debit?: boolean;
  is_active?: boolean;
}

// System account codes (from seed data)
export const SYSTEM_ACCOUNT_CODES = {
  // Assets
  PLATFORM_CASH: "1000",
  ACCOUNTS_RECEIVABLE_AGENCIES: "1100",
  PREPAID_CARD_FUNDS: "1200",
  // Liabilities
  AGENCY_DEPOSITS: "2000",
  ACCOUNTS_PAYABLE_VENDORS: "2100",
  DEFERRED_REVENUE: "2200",
  // Revenue
  MARKUP_REVENUE: "4000",
  INTERCHANGE_REVENUE: "4100",
  SUBSCRIPTION_REVENUE: "4200",
  // Expenses
  API_COSTS: "5000",
  CARD_PROCESSING_FEES: "5100",
  PLATFORM_OPERATING_EXPENSES: "5200",
} as const;

// -----------------------------------------------------------------------------
// JOURNAL ENTRIES
// -----------------------------------------------------------------------------

/**
 * Metadata commonly stored with journal entries.
 * All fields are optional - use what's relevant.
 */
export interface JournalEntryMetadata {
  /** Stripe transaction/payment ID */
  stripe_transaction_id?: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  
  /** Agent/client attribution */
  agent_id?: string;
  client_id?: string;
  project_id?: string;
  
  /** Vendor information */
  vendor_name?: string;
  vendor_mcc?: string;
  
  /** Idempotency key for deduplication */
  idempotency_key?: string;
  
  /** Rebilling info */
  rebill_period_id?: string;
  markup_percentage?: number;
  original_amount_cents?: number;
  
  /** Additional context */
  [key: string]: unknown;
}

export interface JournalEntry {
  id: string;
  transaction_group_id: string;
  account_id: string;
  /** Amount in cents as BigInt. Positive = Debit, Negative = Credit */
  amount: CentsAmount;
  posting_status: PostingStatus;
  description: string | null;
  metadata: JournalEntryMetadata;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Raw journal entry from database (before BigInt conversion).
 * Use `parseJournalEntry` to convert to `JournalEntry`.
 */
export interface JournalEntryRow {
  id: string;
  transaction_group_id: string;
  account_id: string;
  amount: string; // PostgreSQL bigint comes as string
  posting_status: PostingStatus;
  description: string | null;
  metadata: JournalEntryMetadata;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Convert raw database row to JournalEntry with BigInt amount.
 */
export function parseJournalEntry(row: JournalEntryRow): JournalEntry {
  return {
    ...row,
    amount: BigInt(row.amount),
  };
}

/**
 * Convert JournalEntry to row format for database operations.
 */
export function serializeJournalEntry(entry: JournalEntry): JournalEntryRow {
  return {
    ...entry,
    amount: entry.amount.toString(),
  };
}

export interface JournalEntryInsert {
  id?: string;
  transaction_group_id: string;
  account_id: string;
  /** Amount in cents. Positive = Debit, Negative = Credit */
  amount: CentsAmount;
  posting_status?: PostingStatus;
  description?: string | null;
  metadata?: JournalEntryMetadata;
  created_by?: string | null;
}

// -----------------------------------------------------------------------------
// AUDIT LOG
// -----------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  user_id: string | null;
  organization_id: string | null;
  description: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  state_before: Record<string, unknown> | null;
  state_after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  user_id?: string | null;
  organization_id?: string | null;
  description?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
  state_before?: Record<string, unknown> | null;
  state_after?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// -----------------------------------------------------------------------------
// RECORD TRANSACTION INPUT
// -----------------------------------------------------------------------------

/**
 * Input for the record_transaction database function.
 */
export interface RecordTransactionInput {
  debit_account_id: string;
  credit_account_id: string;
  amount_cents: CentsAmount;
  description?: string;
  metadata?: JournalEntryMetadata;
  created_by?: string;
}

// -----------------------------------------------------------------------------
// DATABASE SCHEMA (for Supabase client typing)
// -----------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      chart_of_accounts: {
        Row: ChartOfAccount;
        Insert: ChartOfAccountInsert;
        Update: ChartOfAccountUpdate;
      };
      journal_entries: {
        Row: JournalEntryRow;
        Insert: Omit<JournalEntryInsert, "amount"> & { amount: string };
        Update: { posting_status?: PostingStatus };
      };
      audit_log: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: never; // Audit logs are immutable
      };
    };
    Functions: {
      record_transaction: {
        Args: {
          p_debit_account_id: string;
          p_credit_account_id: string;
          p_amount_cents: string; // BigInt as string
          p_description?: string;
          p_metadata?: JournalEntryMetadata;
          p_created_by?: string;
        };
        Returns: string; // transaction_group_id
      };
      get_account_balance: {
        Args: {
          p_account_id: string;
          p_as_of?: string;
        };
        Returns: string; // BigInt as string
      };
      verify_transaction_balanced: {
        Args: {
          p_transaction_group_id: string;
        };
        Returns: boolean;
      };
      commit_transaction: {
        Args: {
          p_transaction_group_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      account_type: AccountType;
      posting_status: PostingStatus;
    };
  };
}

