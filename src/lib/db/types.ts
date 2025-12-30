/**
 * SWITCHBOARD DATABASE TYPES
 * =============================================================================
 * TypeScript types matching the Supabase schema.
 * Generated from:
 *   - supabase/migrations/001_ledger_schema.sql
 *   - supabase/migrations/002_organizations.sql
 * =============================================================================
 */

import type { CentsAmount } from "@/lib/types/currency";

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type PostingStatus = "pending" | "committed" | "settled";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

// -----------------------------------------------------------------------------
// ORGANIZATIONS
// -----------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  stripe_account_id: string | null;
  stripe_account_requirements_due: unknown[];
  stripe_account_verified_at: string | null;
  /** Markup percentage as decimal (0.15 = 15%) */
  markup_percentage: number;
  billing_email: string | null;
  billing_address: Record<string, unknown> | null;
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
  stripe_account_requirements_due?: unknown[];
  stripe_account_verified_at?: string | null;
  markup_percentage?: number;
  billing_email?: string | null;
  billing_address?: Record<string, unknown> | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface OrganizationUpdate {
  name?: string;
  slug?: string;
  stripe_customer_id?: string | null;
  stripe_account_id?: string | null;
  stripe_account_requirements_due?: unknown[];
  stripe_account_verified_at?: string | null;
  markup_percentage?: number;
  billing_email?: string | null;
  billing_address?: Record<string, unknown> | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// USER PROFILES
// -----------------------------------------------------------------------------

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  slack: boolean;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  default_organization_id: string | null;
  timezone: string;
  notification_preferences: NotificationPreferences;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserProfileInsert {
  id: string; // Must match auth.users.id
  full_name?: string | null;
  avatar_url?: string | null;
  default_organization_id?: string | null;
  timezone?: string;
  notification_preferences?: NotificationPreferences;
  metadata?: Record<string, unknown>;
}

export interface UserProfileUpdate {
  full_name?: string | null;
  avatar_url?: string | null;
  default_organization_id?: string | null;
  timezone?: string;
  notification_preferences?: NotificationPreferences;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// ORGANIZATION MEMBERS
// -----------------------------------------------------------------------------

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMemberInsert {
  id?: string;
  organization_id: string;
  user_id: string;
  role?: OrgRole;
  invited_by?: string | null;
  invited_at?: string;
  accepted_at?: string | null;
}

export interface OrgMemberUpdate {
  role?: OrgRole;
  accepted_at?: string | null;
}

/**
 * Organization member with user profile joined.
 */
export interface OrgMemberWithProfile extends OrgMember {
  user_profile: Pick<UserProfile, "full_name" | "avatar_url"> | null;
}

/**
 * Organization summary view.
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  stripe_account_id: string | null;
  is_stripe_verified: boolean;
  markup_percentage: number;
  is_active: boolean;
  created_at: string;
  member_count: number;
  pending_invites: number;
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
// CLIENTS
// -----------------------------------------------------------------------------

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_item_id: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClientInsert {
  id?: string;
  organization_id: string;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_item_id?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ClientUpdate {
  name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_item_id?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// AGENTS
// -----------------------------------------------------------------------------

export interface Agent {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  monthly_budget_cents: CentsAmount;
  current_spend_cents: CentsAmount;
  reset_date: string; // DATE as ISO string
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentInsert {
  id?: string;
  organization_id: string;
  client_id?: string | null;
  name: string;
  description?: string | null;
  monthly_budget_cents?: CentsAmount;
  current_spend_cents?: CentsAmount;
  reset_date?: string; // DATE as ISO string
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentUpdate {
  name?: string;
  description?: string | null;
  client_id?: string | null;
  monthly_budget_cents?: CentsAmount;
  current_spend_cents?: CentsAmount;
  reset_date?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// VIRTUAL CARDS
// -----------------------------------------------------------------------------

export interface VirtualCard {
  id: string; // Stripe card ID
  agent_id: string;
  organization_id: string;
  stripe_cardholder_id: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  spending_limit_cents: CentsAmount;
  current_spend_cents: CentsAmount;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface VirtualCardInsert {
  id: string; // Stripe card ID
  agent_id: string;
  organization_id: string;
  stripe_cardholder_id: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  spending_limit_cents: CentsAmount;
  current_spend_cents?: CentsAmount;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface VirtualCardUpdate {
  spending_limit_cents?: CentsAmount;
  current_spend_cents?: CentsAmount;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// TRANSACTION LOGS
// -----------------------------------------------------------------------------

export type TransactionStatus = "pending" | "approved" | "declined" | "reversed";

export interface TransactionLog {
  id: string;
  organization_id: string;
  agent_id: string;
  client_id: string | null;
  card_id: string;
  stripe_transaction_id: string;
  stripe_authorization_id: string | null;
  amount_cents: CentsAmount;
  currency: string;
  merchant_name: string;
  merchant_category: string | null;
  merchant_location: string | null;
  description: string | null;
  status: TransactionStatus;
  rebilled: boolean;
  rebill_period_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TransactionLogInsert {
  id?: string;
  organization_id: string;
  agent_id: string;
  client_id?: string | null;
  card_id: string;
  stripe_transaction_id: string;
  stripe_authorization_id?: string | null;
  amount_cents: CentsAmount;
  currency?: string;
  merchant_name: string;
  merchant_category?: string | null;
  merchant_location?: string | null;
  description?: string | null;
  status?: TransactionStatus;
  rebilled?: boolean;
  rebill_period_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TransactionLogUpdate {
  status?: TransactionStatus;
  rebilled?: boolean;
  rebill_period_id?: string | null;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// AUTHORIZATIONS LOG
// -----------------------------------------------------------------------------

export interface AuthorizationLog {
  id: string;
  stripe_authorization_id: string;
  card_id: string;
  amount_cents: CentsAmount;
  merchant_name: string | null;
  merchant_category: string | null;
  approved: boolean;
  decline_code: string | null;
  created_at: string;
}

export interface AuthorizationLogInsert {
  id?: string;
  stripe_authorization_id: string;
  card_id: string;
  amount_cents: CentsAmount;
  merchant_name?: string | null;
  merchant_category?: string | null;
  approved: boolean;
  decline_code?: string | null;
}

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
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      org_members: {
        Row: OrgMember;
        Insert: OrgMemberInsert;
        Update: OrgMemberUpdate;
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
      clients: {
        Row: Client;
        Insert: ClientInsert;
        Update: ClientUpdate;
      };
      agents: {
        Row: Agent;
        Insert: AgentInsert;
        Update: AgentUpdate;
      };
      virtual_cards: {
        Row: VirtualCard;
        Insert: VirtualCardInsert;
        Update: VirtualCardUpdate;
      };
      transaction_logs: {
        Row: TransactionLog;
        Insert: TransactionLogInsert;
        Update: TransactionLogUpdate;
      };
      authorizations_log: {
        Row: AuthorizationLog;
        Insert: AuthorizationLogInsert;
        Update: never; // Immutable log
      };
    };
    Views: {
      organization_summary: {
        Row: OrganizationSummary;
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
      is_org_member: {
        Args: {
          p_org_id: string;
        };
        Returns: boolean;
      };
      has_org_role: {
        Args: {
          p_org_id: string;
          p_min_role: OrgRole;
        };
        Returns: boolean;
      };
      get_user_org_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      get_org_role: {
        Args: {
          p_org_id: string;
        };
        Returns: OrgRole | null;
      };
      get_agent_current_spend: {
        Args: {
          p_agent_id: string;
        };
        Returns: string; // BigInt as string
      };
      get_client_billable_amount: {
        Args: {
          p_client_id: string;
          p_period_start: string; // DATE as ISO string
          p_period_end: string; // DATE as ISO string
        };
        Returns: string; // BigInt as string
      };
    };
    Enums: {
      account_type: AccountType;
      posting_status: PostingStatus;
      org_role: OrgRole;
    };
  };
}

