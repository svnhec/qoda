/**
 * SWITCHBOARD APPLICATION TYPES
 * =============================================================================
 * Core TypeScript interfaces for the Switchboard application.
 * These are the primary domain models used throughout the app.
 * =============================================================================
 */

import type { CentsAmount } from "./types/currency";

// -----------------------------------------------------------------------------
// ORGANIZATION
// -----------------------------------------------------------------------------

/**
 * Organization (Agency) that uses Switchboard.
 * Each organization can have multiple clients and agents.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  stripe_account_id: string | null;
  stripe_account_verified_at: string | null;
  /** Default markup percentage as decimal (0.15 = 15%) */
  markup_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// CLIENT
// -----------------------------------------------------------------------------

/**
 * End-client of an agency.
 * The agency builds agents for these clients and rebills them.
 */
export interface Client {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  stripe_customer_id: string | null; // For invoicing
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// AGENT
// -----------------------------------------------------------------------------

/**
 * AI Agent or Project.
 * Represents an autonomous agent that needs a virtual card for spending.
 */
export interface Agent {
  id: string;
  organization_id: string;
  client_id: string | null; // Null if agency-level agent
  name: string;
  description: string | null;
  /** Virtual card ID from Stripe Issuing */
  card_id: string | null;
  /** Monthly spending limit in cents */
  spend_limit_cents: CentsAmount;
  /** Current month's spend in cents */
  current_spend_cents: CentsAmount;
  /** Status: active, paused, archived */
  status: "active" | "paused" | "archived";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// VIRTUAL CARD
// -----------------------------------------------------------------------------

/**
 * Virtual card issued to an agent.
 * Linked to Stripe Issuing card.
 */
export interface VirtualCard {
  id: string;
  agent_id: string;
  organization_id: string;
  /** Stripe Issuing Card ID */
  stripe_card_id: string;
  /** Last 4 digits of card number */
  last4: string;
  /** Card brand (visa, mastercard, etc.) */
  brand: string;
  /** Expiration month (1-12) */
  exp_month: number;
  /** Expiration year (YYYY) */
  exp_year: number;
  /** Monthly spending limit in cents */
  spend_limit_cents: CentsAmount;
  /** Current month's spend in cents */
  current_spend_cents: CentsAmount;
  /** Card status: active, inactive, cancelled */
  status: "active" | "inactive" | "cancelled";
  /** Metadata from Stripe */
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// JOURNAL ENTRY
// -----------------------------------------------------------------------------

/**
 * Double-entry ledger journal entry.
 * Part of a transaction group (balanced debit/credit pair).
 */
export interface JournalEntry {
  id: string;
  transaction_group_id: string;
  account_id: string;
  /** Amount in cents. Positive = Debit, Negative = Credit */
  amount: CentsAmount;
  posting_status: "pending" | "committed" | "settled";
  description: string | null;
  metadata: JournalEntryMetadata;
  created_at: string;
  updated_at: string;
}

/**
 * Metadata stored with journal entries.
 */
export interface JournalEntryMetadata {
  /** Stripe transaction/payment IDs */
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
  
  /** Idempotency key */
  idempotency_key?: string;
  
  /** Rebilling info */
  rebill_period_id?: string;
  markup_percentage?: number;
  original_amount_cents?: number;
  
  /** Additional context */
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// TRANSACTION LOG
// -----------------------------------------------------------------------------

/**
 * Transaction log entry.
 * Represents a single spend transaction from a virtual card.
 * Used for attribution and rebilling.
 */
export interface TransactionLog {
  id: string;
  organization_id: string;
  agent_id: string;
  client_id: string | null;
  /** Stripe Issuing Transaction ID */
  stripe_transaction_id: string;
  /** Stripe Authorization ID */
  stripe_authorization_id: string | null;
  /** Amount in cents */
  amount_cents: CentsAmount;
  /** Currency code (USD) */
  currency: string;
  /** Merchant name */
  merchant_name: string;
  /** Merchant category code */
  merchant_category: string | null;
  /** Transaction description */
  description: string | null;
  /** Transaction status */
  status: "pending" | "approved" | "declined" | "reversed";
  /** Whether this transaction has been rebilled */
  rebilled: boolean;
  /** Rebill period ID if rebilled */
  rebill_period_id: string | null;
  /** Metadata */
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// UTILITY TYPES
// -----------------------------------------------------------------------------

/**
 * Pagination parameters.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * API response wrapper.
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Date range filter.
 */
export interface DateRange {
  from: Date | string;
  to: Date | string;
}

/**
 * Spending summary for an agent/client/organization.
 */
export interface SpendingSummary {
  period_start: string;
  period_end: string;
  total_spend_cents: CentsAmount;
  transaction_count: number;
  by_vendor: Array<{
    vendor_name: string;
    amount_cents: CentsAmount;
    transaction_count: number;
  }>;
  by_category: Array<{
    category: string;
    amount_cents: CentsAmount;
    transaction_count: number;
  }>;
}

