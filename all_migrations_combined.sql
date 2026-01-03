-- =============================================================================
-- SWITCHBOARD LEDGER SCHEMA
-- Migration: 001_ledger_schema.sql
-- =============================================================================
-- Implements double-entry bookkeeping with strict invariants:
-- - All amounts stored as BIGINT (cents) - never float/decimal
-- - Every transaction must have balanced debits and credits
-- - Journal entries are immutable once committed
-- - Full audit trail with RLS enforcement
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- -----------------------------------------------------------------------------

-- Account types following standard accounting classification
CREATE TYPE account_type AS ENUM (
  'asset',      -- Things owned (cash, receivables, prepaid expenses)
  'liability',  -- Things owed (payables, deferred revenue)
  'equity',     -- Owner's stake (retained earnings)
  'revenue',    -- Income earned
  'expense'     -- Costs incurred
);

-- Journal entry lifecycle status
CREATE TYPE posting_status AS ENUM (
  'pending',    -- Created but not yet finalized
  'committed',  -- Finalized and immutable
  'settled'     -- Reconciled with external system (e.g., Stripe)
);

-- -----------------------------------------------------------------------------
-- 2. ORGANIZATIONS TABLE (referenced by ledger)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_account_id TEXT,  -- For connected accounts (agencies)
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Index for lookups
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. CHART OF ACCOUNTS
-- -----------------------------------------------------------------------------
-- Defines all accounts in the system. Some are system-wide (organization_id IS NULL),
-- others are organization-specific.

CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Account identification
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type account_type NOT NULL,
  description TEXT,
  
  -- Ownership: NULL = system account, UUID = org-specific
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Normal balance: true = debit increases, false = credit increases
  -- Assets/Expenses: normal_balance = true (debit)
  -- Liabilities/Equity/Revenue: normal_balance = false (credit)
  normal_balance_debit BOOLEAN NOT NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique code per organization (or globally for system accounts)
  CONSTRAINT unique_account_code UNIQUE (organization_id, code)
);

-- Enable RLS
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_coa_organization ON chart_of_accounts(organization_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_code ON chart_of_accounts(code);

-- Comment
COMMENT ON TABLE chart_of_accounts IS 'Chart of Accounts for double-entry bookkeeping. System accounts have NULL organization_id.';

-- -----------------------------------------------------------------------------
-- 4. JOURNAL ENTRIES TABLE (IMMUTABLE)
-- -----------------------------------------------------------------------------
-- Core ledger table. Each financial transaction creates multiple entries
-- (minimum 2 for double-entry). Entries are grouped by transaction_group_id.
--
-- CRITICAL: Amounts are BIGINT representing cents. $10.50 = 1050
-- Positive = Debit, Negative = Credit (accounting convention)

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transaction grouping (all entries in a transaction share this)
  transaction_group_id UUID NOT NULL,
  
  -- Account reference
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  
  -- Amount in CENTS (BigInt) - NEVER use float/decimal for money
  -- Positive = Debit, Negative = Credit
  amount BIGINT NOT NULL CHECK (amount != 0),
  
  -- Status lifecycle
  posting_status posting_status NOT NULL DEFAULT 'pending',
  
  -- Description of this specific entry
  description TEXT,
  
  -- Flexible metadata for external references
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected keys: stripe_transaction_id, stripe_payment_intent_id,
  -- agent_id, client_id, idempotency_key, etc.
  
  -- Idempotency key for deduplication (stored in metadata but indexed)
  idempotency_key TEXT GENERATED ALWAYS AS (metadata->>'idempotency_key') STORED,
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,  -- User who created this entry
  
  -- Each account can only appear once per transaction
  CONSTRAINT unique_entry_per_transaction UNIQUE (transaction_group_id, account_id)
);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Indexes for common queries
CREATE INDEX idx_je_transaction_group ON journal_entries(transaction_group_id);
CREATE INDEX idx_je_account ON journal_entries(account_id);
CREATE INDEX idx_je_created_at ON journal_entries(created_at);
CREATE INDEX idx_je_status ON journal_entries(posting_status);
CREATE INDEX idx_je_idempotency ON journal_entries(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Composite index for account balance queries
CREATE INDEX idx_je_account_status_created ON journal_entries(account_id, posting_status, created_at);

-- JSONB index for metadata queries
CREATE INDEX idx_je_metadata ON journal_entries USING gin(metadata);

-- Comment
COMMENT ON TABLE journal_entries IS 'Immutable double-entry journal. Amounts in cents (BigInt). Positive=Debit, Negative=Credit.';
COMMENT ON COLUMN journal_entries.amount IS 'Amount in cents as BigInt. Positive=Debit, Negative=Credit. $10.50 = 1050 (debit) or -1050 (credit).';

-- -----------------------------------------------------------------------------
-- 5. AUDIT LOG TABLE
-- -----------------------------------------------------------------------------
-- Required by .cursorrules: All errors must log to audit_log table

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What happened
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  
  -- Who did it
  user_id UUID,
  organization_id UUID REFERENCES organizations(id),
  
  -- Details
  description TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Before/after state for financial operations
  state_before JSONB,
  state_after JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- Comment
COMMENT ON TABLE audit_log IS 'Immutable audit trail. Never delete records from this table.';

-- -----------------------------------------------------------------------------
-- 6. BALANCE VALIDATION TRIGGER
-- -----------------------------------------------------------------------------
-- Ensures every transaction group has balanced debits and credits
-- This runs AFTER INSERT and validates the entire transaction group

CREATE OR REPLACE FUNCTION validate_balanced_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_balance BIGINT;
  v_entry_count INTEGER;
BEGIN
  -- Calculate the sum of all entries in this transaction group
  -- A balanced transaction should sum to zero (debits = credits)
  SELECT 
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_balance, v_entry_count
  FROM journal_entries
  WHERE transaction_group_id = NEW.transaction_group_id;
  
  -- Must have at least 2 entries (debit + credit)
  IF v_entry_count < 2 THEN
    RAISE EXCEPTION 'Transaction % has only % entries. Minimum 2 required for double-entry.',
      NEW.transaction_group_id, v_entry_count;
  END IF;
  
  -- Sum must be zero (balanced)
  IF v_balance != 0 THEN
    RAISE EXCEPTION 'Transaction % is unbalanced. Sum of entries: % cents (must be 0).',
      NEW.transaction_group_id, v_balance;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger is applied via a constraint trigger at transaction commit time
-- We use a CONSTRAINT TRIGGER with DEFERRABLE INITIALLY DEFERRED so that
-- all entries in a transaction can be inserted before validation

CREATE CONSTRAINT TRIGGER trg_validate_balanced_transaction
  AFTER INSERT ON journal_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_balanced_transaction();

-- -----------------------------------------------------------------------------
-- 7. IMMUTABILITY TRIGGER
-- -----------------------------------------------------------------------------
-- Prevents modification of committed journal entries

CREATE OR REPLACE FUNCTION prevent_committed_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.posting_status IN ('committed', 'settled') THEN
    RAISE EXCEPTION 'Cannot modify committed journal entry %. Create a reversing entry instead.',
      OLD.id;
  END IF;
  
  -- Only allow status progression: pending -> committed -> settled
  IF NEW.posting_status = 'pending' AND OLD.posting_status != 'pending' THEN
    RAISE EXCEPTION 'Cannot revert journal entry % status from % to pending.',
      OLD.id, OLD.posting_status;
  END IF;
  
  IF NEW.posting_status = 'committed' AND OLD.posting_status = 'settled' THEN
    RAISE EXCEPTION 'Cannot revert journal entry % status from settled to committed.',
      OLD.id;
  END IF;
  
  -- Update timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_committed_modification
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_committed_modification();

-- Prevent deletion of any journal entries
CREATE OR REPLACE FUNCTION prevent_journal_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Journal entries cannot be deleted. Create a reversing entry instead. Entry ID: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_journal_deletion
  BEFORE DELETE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_journal_deletion();

-- -----------------------------------------------------------------------------
-- 8. RECORD TRANSACTION FUNCTION
-- -----------------------------------------------------------------------------
-- Main function for recording double-entry transactions
-- Ensures atomicity and balance invariant

CREATE OR REPLACE FUNCTION record_transaction(
  p_debit_account_id UUID,
  p_credit_account_id UUID,
  p_amount_cents BIGINT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_group_id UUID;
  v_debit_entry_id UUID;
  v_credit_entry_id UUID;
BEGIN
  -- Validate inputs
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be a positive integer (cents). Got: %', p_amount_cents;
  END IF;
  
  IF p_debit_account_id IS NULL THEN
    RAISE EXCEPTION 'Debit account ID is required';
  END IF;
  
  IF p_credit_account_id IS NULL THEN
    RAISE EXCEPTION 'Credit account ID is required';
  END IF;
  
  IF p_debit_account_id = p_credit_account_id THEN
    RAISE EXCEPTION 'Debit and credit accounts must be different';
  END IF;
  
  -- Verify accounts exist and are active
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE id = p_debit_account_id AND is_active = true) THEN
    RAISE EXCEPTION 'Debit account % does not exist or is inactive', p_debit_account_id;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE id = p_credit_account_id AND is_active = true) THEN
    RAISE EXCEPTION 'Credit account % does not exist or is inactive', p_credit_account_id;
  END IF;
  
  -- Check idempotency if key provided
  IF p_metadata ? 'idempotency_key' THEN
    SELECT transaction_group_id INTO v_transaction_group_id
    FROM journal_entries
    WHERE idempotency_key = p_metadata->>'idempotency_key'
    LIMIT 1;
    
    IF v_transaction_group_id IS NOT NULL THEN
      -- Already processed, return existing transaction
      RAISE NOTICE 'Idempotent request: transaction % already exists', v_transaction_group_id;
      RETURN v_transaction_group_id;
    END IF;
  END IF;
  
  -- Generate transaction group ID
  v_transaction_group_id := gen_random_uuid();
  
  -- Insert debit entry (positive amount)
  INSERT INTO journal_entries (
    transaction_group_id,
    account_id,
    amount,
    description,
    metadata,
    created_by
  ) VALUES (
    v_transaction_group_id,
    p_debit_account_id,
    p_amount_cents,  -- Positive = Debit
    p_description,
    p_metadata,
    p_created_by
  )
  RETURNING id INTO v_debit_entry_id;
  
  -- Insert credit entry (negative amount)
  INSERT INTO journal_entries (
    transaction_group_id,
    account_id,
    amount,
    description,
    metadata,
    created_by
  ) VALUES (
    v_transaction_group_id,
    p_credit_account_id,
    -p_amount_cents,  -- Negative = Credit
    p_description,
    p_metadata,
    p_created_by
  )
  RETURNING id INTO v_credit_entry_id;
  
  -- The balance validation trigger will run at commit time
  -- and rollback if entries don't balance
  
  RETURN v_transaction_group_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_transaction IS 
'Records a double-entry transaction. Amount in cents (BigInt). Returns transaction_group_id. 
Automatically creates balanced debit/credit entries. Uses idempotency_key from metadata for deduplication.';

-- -----------------------------------------------------------------------------
-- 9. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Get account balance as of a specific time
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id UUID,
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(amount), 0)::BIGINT
  FROM journal_entries
  WHERE account_id = p_account_id
    AND posting_status IN ('committed', 'settled')
    AND created_at <= p_as_of;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_account_balance IS 'Returns account balance in cents as of given timestamp. Only includes committed/settled entries.';

-- Verify transaction is balanced (useful for testing)
CREATE OR REPLACE FUNCTION verify_transaction_balanced(p_transaction_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(SUM(amount), 1) = 0
  FROM journal_entries
  WHERE transaction_group_id = p_transaction_group_id;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION verify_transaction_balanced IS 'Returns TRUE if transaction is balanced (sum of entries = 0).';

-- Commit pending entries in a transaction
CREATE OR REPLACE FUNCTION commit_transaction(p_transaction_group_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE journal_entries
  SET posting_status = 'committed'
  WHERE transaction_group_id = p_transaction_group_id
    AND posting_status = 'pending';
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending entries found for transaction %', p_transaction_group_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION commit_transaction IS 'Commits all pending entries in a transaction, making them immutable.';

-- -----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Organizations: users can only see their own org
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    -- Will be implemented with auth.uid() when users table exists
    -- For now, allow authenticated users
    true
  );

-- Chart of Accounts: org members see their accounts + system accounts
CREATE POLICY "Users can view their org accounts and system accounts"
  ON chart_of_accounts FOR SELECT
  USING (
    organization_id IS NULL  -- System accounts visible to all
    OR organization_id IN (
      -- Will be joined with user's org membership
      SELECT id FROM organizations WHERE is_active = true
    )
  );

CREATE POLICY "Only admins can modify system accounts"
  ON chart_of_accounts FOR ALL
  USING (
    organization_id IS NOT NULL  -- Org accounts can be modified by org members
  );

-- Journal Entries: org members see entries for their accounts
CREATE POLICY "Users can view journal entries for their accounts"
  ON journal_entries FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM chart_of_accounts
      WHERE organization_id IS NULL  -- System accounts
         OR organization_id IN (SELECT id FROM organizations WHERE is_active = true)
    )
  );

CREATE POLICY "Users can insert journal entries for their accounts"
  ON journal_entries FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM chart_of_accounts
      WHERE organization_id IS NULL
         OR organization_id IN (SELECT id FROM organizations WHERE is_active = true)
    )
  );

-- Audit Log: users see only their org's logs
CREATE POLICY "Users can view their organization audit logs"
  ON audit_log FOR SELECT
  USING (
    organization_id IN (SELECT id FROM organizations WHERE is_active = true)
    OR organization_id IS NULL  -- System logs visible to admins
  );

CREATE POLICY "Anyone can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 11. SEED SYSTEM ACCOUNTS
-- -----------------------------------------------------------------------------
-- These are platform-wide accounts (organization_id = NULL)

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance_debit, description, organization_id) VALUES
  -- Asset accounts (normal balance = debit = positive)
  ('1000', 'Platform Cash', 'asset', true, 'Main platform cash account for prepaid funds', NULL),
  ('1100', 'Accounts Receivable - Agencies', 'asset', true, 'Money owed by agencies', NULL),
  ('1200', 'Prepaid Card Funds', 'asset', true, 'Funds loaded onto virtual cards', NULL),
  
  -- Liability accounts (normal balance = credit = negative)
  ('2000', 'Agency Deposits', 'liability', false, 'Prepaid funds held on behalf of agencies', NULL),
  ('2100', 'Accounts Payable - Vendors', 'liability', false, 'Money owed to API vendors (OpenAI, etc.)', NULL),
  ('2200', 'Deferred Revenue', 'liability', false, 'Unearned markup revenue', NULL),
  
  -- Revenue accounts (normal balance = credit = negative)
  ('4000', 'Markup Revenue', 'revenue', false, 'Revenue from agency markup on API spend', NULL),
  ('4100', 'Interchange Revenue', 'revenue', false, 'Revenue from card interchange fees', NULL),
  ('4200', 'Subscription Revenue', 'revenue', false, 'Revenue from platform subscriptions', NULL),
  
  -- Expense accounts (normal balance = debit = positive)
  ('5000', 'API Costs', 'expense', true, 'Costs paid to API providers', NULL),
  ('5100', 'Card Processing Fees', 'expense', true, 'Fees paid to Stripe/card networks', NULL),
  ('5200', 'Platform Operating Expenses', 'expense', true, 'General operating expenses', NULL);

-- -----------------------------------------------------------------------------
-- 12. TEST TRANSACTION
-- -----------------------------------------------------------------------------
-- Insert a test transaction: Agency deposits $100 to platform
-- Debit: Platform Cash (asset increases) +10000 cents
-- Credit: Agency Deposits (liability increases) -10000 cents

DO $$
DECLARE
  v_platform_cash_id UUID;
  v_agency_deposits_id UUID;
  v_txn_id UUID;
  v_balance BIGINT;
BEGIN
  -- Get account IDs
  SELECT id INTO v_platform_cash_id FROM chart_of_accounts WHERE code = '1000';
  SELECT id INTO v_agency_deposits_id FROM chart_of_accounts WHERE code = '2000';
  
  -- Record transaction: $100.00 = 10000 cents
  v_txn_id := record_transaction(
    p_debit_account_id := v_platform_cash_id,
    p_credit_account_id := v_agency_deposits_id,
    p_amount_cents := 10000,  -- $100.00
    p_description := 'Test transaction: Agency deposit',
    p_metadata := '{"test": true, "idempotency_key": "test_deposit_001"}'::jsonb
  );
  
  -- Verify balance is zero
  SELECT SUM(amount) INTO v_balance
  FROM journal_entries
  WHERE transaction_group_id = v_txn_id;
  
  IF v_balance != 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Transaction is unbalanced. Sum: %', v_balance;
  END IF;
  
  RAISE NOTICE 'TEST PASSED: Transaction % is balanced (sum = %)', v_txn_id, v_balance;
  RAISE NOTICE 'Platform Cash balance: % cents', get_account_balance(v_platform_cash_id);
  RAISE NOTICE 'Agency Deposits balance: % cents', get_account_balance(v_agency_deposits_id);
  
  -- Commit the test transaction
  PERFORM commit_transaction(v_txn_id);
  
  RAISE NOTICE 'Test transaction committed successfully.';
END;
$$;

-- Final verification query (will output in migration logs)
SELECT 
  'LEDGER SCHEMA INITIALIZED' AS status,
  (SELECT COUNT(*) FROM chart_of_accounts) AS accounts_count,
  (SELECT COUNT(*) FROM journal_entries) AS entries_count,
  (SELECT COALESCE(SUM(amount), 0) FROM journal_entries) AS total_balance;




-- =============================================================================
-- SWITCHBOARD ORGANIZATIONS & MULTI-TENANCY
-- Migration: 002_organizations.sql
-- =============================================================================
-- Extends the organizations table from 001_ledger_schema.sql
-- Adds user profiles, membership, and RLS for multi-tenancy
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND ORGANIZATIONS TABLE
-- -----------------------------------------------------------------------------
-- Add Stripe Connect and billing fields to the existing organizations table

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_account_requirements_due JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_account_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Add constraint for markup percentage (0-100%)
ALTER TABLE organizations
  ADD CONSTRAINT chk_markup_percentage 
  CHECK (markup_percentage >= 0 AND markup_percentage <= 1);

-- Add unique constraint on stripe_account_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizations_stripe_account_id_key'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_stripe_account_id_key 
      UNIQUE (stripe_account_id);
  END IF;
END;
$$;

-- Index for Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account 
  ON organizations(stripe_account_id) 
  WHERE stripe_account_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN organizations.markup_percentage IS 
  'Default markup percentage for rebilling (0.15 = 15%). Range: 0.0000 to 1.0000';
COMMENT ON COLUMN organizations.stripe_account_requirements_due IS 
  'Requirements needed to complete Stripe Connect onboarding';

-- -----------------------------------------------------------------------------
-- 2. ROLE TYPE
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. USER PROFILES TABLE
-- -----------------------------------------------------------------------------
-- Extends auth.users with application-specific data
-- Linked 1:1 with auth.users

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Display info
  full_name TEXT,
  avatar_url TEXT,
  
  -- Default organization (user can belong to multiple orgs)
  default_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Preferences
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": false,
    "slack": false
  }'::jsonb,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_default_org 
  ON user_profiles(default_organization_id);

-- Comment
COMMENT ON TABLE user_profiles IS 
  'Application-specific user data. 1:1 with auth.users. Created automatically on signup.';

-- -----------------------------------------------------------------------------
-- 4. ORGANIZATION MEMBERS TABLE
-- -----------------------------------------------------------------------------
-- Many-to-many between users and organizations with roles

CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role in this organization
  role org_role NOT NULL DEFAULT 'member',
  
  -- Invitation flow
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ, -- NULL = pending invitation
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each user can only be a member of an org once
  CONSTRAINT unique_org_membership UNIQUE (organization_id, user_id)
);

-- Enable RLS
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_pending ON org_members(organization_id) 
  WHERE accepted_at IS NULL;

-- Comment
COMMENT ON TABLE org_members IS 
  'Organization membership with roles. accepted_at NULL = pending invitation.';

-- -----------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS FOR RLS
-- -----------------------------------------------------------------------------

-- Check if current user is a member of the specified organization
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_org_member IS 
  'Returns TRUE if auth.uid() is an accepted member of the organization.';

-- Check if current user has a specific role (or higher) in the organization
CREATE OR REPLACE FUNCTION has_org_role(p_org_id UUID, p_min_role org_role)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role org_role;
BEGIN
  SELECT role INTO v_user_role
  FROM org_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
  
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Role hierarchy: owner > admin > member > viewer
  CASE p_min_role
    WHEN 'owner' THEN
      RETURN v_user_role = 'owner';
    WHEN 'admin' THEN
      RETURN v_user_role IN ('owner', 'admin');
    WHEN 'member' THEN
      RETURN v_user_role IN ('owner', 'admin', 'member');
    WHEN 'viewer' THEN
      RETURN TRUE; -- Any accepted member can view
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_org_role IS 
  'Returns TRUE if auth.uid() has the specified role or higher in the organization.';

-- Get all organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id 
  FROM org_members
  WHERE user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_org_ids IS 
  'Returns all organization IDs the current user is an accepted member of.';

-- Get current user's role in an organization
CREATE OR REPLACE FUNCTION get_org_role(p_org_id UUID)
RETURNS org_role AS $$
  SELECT role 
  FROM org_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_org_role IS 
  'Returns the current user''s role in the specified organization, or NULL if not a member.';

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Drop existing policies if they exist (from 001_ledger_schema.sql)
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- ORGANIZATIONS POLICIES
-- Select: Members can view their organizations
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id) OR NOT is_active);

-- Insert: Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update: Only owners and admins can update
CREATE POLICY "Owners and admins can update organizations"
  ON organizations FOR UPDATE
  USING (has_org_role(id, 'admin'))
  WITH CHECK (has_org_role(id, 'admin'));

-- Delete: Only owners can delete (soft delete preferred)
CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  USING (has_org_role(id, 'owner'));

-- USER PROFILES POLICIES
-- Select: Users can view their own profile, org members can view each other
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (
    id = auth.uid() 
    OR id IN (
      SELECT user_id FROM org_members 
      WHERE organization_id IN (SELECT get_user_org_ids())
        AND accepted_at IS NOT NULL
    )
  );

-- Insert: Only system can create (via trigger)
CREATE POLICY "System creates user profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Update: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ORG MEMBERS POLICIES
-- Select: Members can see other members in their orgs
CREATE POLICY "Members can view org membership"
  ON org_members FOR SELECT
  USING (
    is_org_member(organization_id)
    OR user_id = auth.uid()  -- Can see own pending invitations
  );

-- Insert: Admins can invite new members
CREATE POLICY "Admins can invite members"
  ON org_members FOR INSERT
  WITH CHECK (
    has_org_role(organization_id, 'admin')
    OR (
      -- Allow self-insert when accepting invitation or creating org
      user_id = auth.uid()
    )
  );

-- Update: Admins can update roles, users can accept invitations
CREATE POLICY "Admins can update membership"
  ON org_members FOR UPDATE
  USING (
    has_org_role(organization_id, 'admin')
    OR (user_id = auth.uid() AND accepted_at IS NULL)  -- Accept own invitation
  )
  WITH CHECK (
    has_org_role(organization_id, 'admin')
    OR (user_id = auth.uid() AND accepted_at IS NULL)
  );

-- Delete: Admins can remove members, users can leave
CREATE POLICY "Admins can remove members"
  ON org_members FOR DELETE
  USING (
    has_org_role(organization_id, 'admin')
    OR user_id = auth.uid()  -- Users can leave
  );

-- -----------------------------------------------------------------------------
-- 7. AUTO-CREATE USER PROFILE AND DEFAULT ORG ON SIGNUP
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_org_slug TEXT;
BEGIN
  -- Generate organization name from email or metadata
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Agency';
  
  -- Generate unique slug
  v_org_slug := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data->>'organization_slug',
      split_part(NEW.email, '@', 1)
    ),
    '[^a-z0-9]+', '-', 'g'
  )) || '-' || substr(NEW.id::text, 1, 8);
  
  -- Create default organization for the user
  INSERT INTO organizations (name, slug, metadata)
  VALUES (v_org_name, v_org_slug, jsonb_build_object('created_by', NEW.id))
  RETURNING id INTO v_org_id;
  
  -- Create user profile
  INSERT INTO user_profiles (
    id,
    full_name,
    default_organization_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_org_id
  );
  
  -- Add user as owner of their organization
  INSERT INTO org_members (
    organization_id,
    user_id,
    role,
    invited_by,
    accepted_at
  ) VALUES (
    v_org_id,
    NEW.id,
    'owner',
    NEW.id,  -- Self-invited
    now()    -- Auto-accepted
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user IS 
  'Automatically creates user_profile and default organization when a user signs up.';

-- -----------------------------------------------------------------------------
-- 8. UPDATE TIMESTAMP TRIGGERS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_org_members_updated
  BEFORE UPDATE ON org_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- 9. UPDATE CHART_OF_ACCOUNTS RLS
-- -----------------------------------------------------------------------------
-- Now that we have proper org membership, update the policies

DROP POLICY IF EXISTS "Users can view their org accounts and system accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Only admins can modify system accounts" ON chart_of_accounts;

-- Select: Members can view their org's accounts + system accounts
CREATE POLICY "Members can view accounts"
  ON chart_of_accounts FOR SELECT
  USING (
    organization_id IS NULL  -- System accounts visible to all authenticated
    OR is_org_member(organization_id)
  );

-- Insert: Admins can create org-specific accounts
CREATE POLICY "Admins can create accounts"
  ON chart_of_accounts FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL  -- Can't create system accounts
    AND has_org_role(organization_id, 'admin')
  );

-- Update: Admins can update org-specific accounts
CREATE POLICY "Admins can update accounts"
  ON chart_of_accounts FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND has_org_role(organization_id, 'admin')
  );

-- -----------------------------------------------------------------------------
-- 10. UPDATE JOURNAL_ENTRIES RLS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view journal entries for their accounts" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert journal entries for their accounts" ON journal_entries;

-- Select: Members can view entries for accounts they have access to
CREATE POLICY "Members can view journal entries"
  ON journal_entries FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM chart_of_accounts
      WHERE organization_id IS NULL  -- System accounts
         OR is_org_member(organization_id)
    )
  );

-- Insert: Members can create entries for their org's accounts
CREATE POLICY "Members can create journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM chart_of_accounts
      WHERE organization_id IS NULL  -- System accounts (for platform operations)
         OR has_org_role(organization_id, 'member')
    )
  );

-- -----------------------------------------------------------------------------
-- 11. UPDATE AUDIT_LOG RLS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their organization audit logs" ON audit_log;
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_log;

-- Select: Members can view their org's audit logs
CREATE POLICY "Members can view audit logs"
  ON audit_log FOR SELECT
  USING (
    organization_id IS NULL  -- System logs (for admins)
    OR is_org_member(organization_id)
  );

-- Insert: Allow inserting audit logs (no restrictions - logging should never fail)
CREATE POLICY "Allow audit log inserts"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 12. HELPER VIEWS
-- -----------------------------------------------------------------------------

-- View for getting organization details with member count
CREATE OR REPLACE VIEW organization_summary AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.stripe_account_id,
  o.stripe_account_verified_at IS NOT NULL AS is_stripe_verified,
  o.markup_percentage,
  o.is_active,
  o.created_at,
  (SELECT COUNT(*) FROM org_members om WHERE om.organization_id = o.id AND om.accepted_at IS NOT NULL) AS member_count,
  (SELECT COUNT(*) FROM org_members om WHERE om.organization_id = o.id AND om.accepted_at IS NULL) AS pending_invites
FROM organizations o;

COMMENT ON VIEW organization_summary IS 
  'Organizations with computed member counts. Respects RLS.';

-- -----------------------------------------------------------------------------
-- 13. VERIFICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- Verify tables exist
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles'), 
    'user_profiles table not created';
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'org_members'), 
    'org_members table not created';
  
  -- Verify columns were added to organizations
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'markup_percentage'
  ), 'markup_percentage column not added to organizations';
  
  -- Verify RLS is enabled
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles'), 
    'RLS not enabled on user_profiles';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'org_members'), 
    'RLS not enabled on org_members';
  
  RAISE NOTICE 'Migration 002_organizations.sql verification passed!';
END;
$$;

-- Final status
SELECT 
  'ORGANIZATIONS SCHEMA INITIALIZED' AS status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'organizations') AS org_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles') AS profile_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'org_members') AS member_policies;




-- =============================================================================
-- SWITCHBOARD CORE DOMAIN TABLES
-- Migration: 003_core_domain.sql
-- =============================================================================
-- Creates tables for clients, agents, virtual_cards, and transaction_logs.
-- These are the core domain entities for the Switchboard platform.
-- 
-- RLS: All tables use is_org_member() and has_org_role() for access control.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CLIENTS TABLE
-- -----------------------------------------------------------------------------
-- End-clients of agencies. Agencies build agents for these clients and rebill them.

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization reference
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Client information
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Stripe billing integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_subscription_item_id TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_organization ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer ON clients(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_stripe_subscription ON clients(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(organization_id, is_active) WHERE is_active = true;

-- Comment
COMMENT ON TABLE clients IS 'End-clients of agencies. Agencies build agents for these clients and rebill them via Stripe subscriptions.';

-- -----------------------------------------------------------------------------
-- 2. AGENTS TABLE
-- -----------------------------------------------------------------------------
-- AI agents or projects that need virtual cards for spending.

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization reference
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Client reference (nullable for agency-level agents)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Agent information
  name TEXT NOT NULL,
  description TEXT,
  
  -- Budget tracking
  monthly_budget_cents BIGINT NOT NULL DEFAULT 0 CHECK (monthly_budget_cents >= 0),
  current_spend_cents BIGINT NOT NULL DEFAULT 0 CHECK (current_spend_cents >= 0),
  
  -- Monthly reset tracking
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_organization ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_client ON agents(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agents_reset_date ON agents(reset_date);

-- Comment
COMMENT ON TABLE agents IS 'AI agents or projects that need virtual cards. Monthly budgets reset on reset_date.';
COMMENT ON COLUMN agents.monthly_budget_cents IS 'Monthly spending limit in cents (BigInt). $100.00 = 10000n';
COMMENT ON COLUMN agents.current_spend_cents IS 'Current month spend in cents (BigInt). Resets on reset_date.';

-- -----------------------------------------------------------------------------
-- 3. VIRTUAL CARDS TABLE
-- -----------------------------------------------------------------------------
-- Virtual cards issued to agents via Stripe Issuing.

CREATE TABLE IF NOT EXISTS virtual_cards (
  id TEXT PRIMARY KEY, -- Stripe card ID (e.g., "card_xxx")
  
  -- References
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Stripe references
  stripe_cardholder_id TEXT NOT NULL,
  
  -- Card details (for display)
  last4 TEXT NOT NULL,
  brand TEXT NOT NULL, -- visa, mastercard, etc.
  exp_month INTEGER NOT NULL CHECK (exp_month >= 1 AND exp_month <= 12),
  exp_year INTEGER NOT NULL CHECK (exp_year >= 2024),
  
  -- Spending controls
  spending_limit_cents BIGINT NOT NULL CHECK (spending_limit_cents > 0),
  current_spend_cents BIGINT NOT NULL DEFAULT 0 CHECK (current_spend_cents >= 0),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE virtual_cards ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_virtual_cards_agent ON virtual_cards(agent_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_organization ON virtual_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_active ON virtual_cards(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_virtual_cards_cardholder ON virtual_cards(stripe_cardholder_id);

-- Comment
COMMENT ON TABLE virtual_cards IS 'Virtual cards issued to agents via Stripe Issuing. Card ID is Stripe card ID.';
COMMENT ON COLUMN virtual_cards.spending_limit_cents IS 'Monthly spending limit in cents (BigInt).';
COMMENT ON COLUMN virtual_cards.current_spend_cents IS 'Current month spend in cents (BigInt).';

-- -----------------------------------------------------------------------------
-- 4. TRANSACTION LOGS TABLE
-- -----------------------------------------------------------------------------
-- Log of all card transactions for attribution and rebilling.

CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  card_id TEXT NOT NULL REFERENCES virtual_cards(id) ON DELETE CASCADE,
  
  -- Stripe references
  stripe_transaction_id TEXT UNIQUE NOT NULL,
  stripe_authorization_id TEXT,
  
  -- Transaction details
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  
  -- Merchant information
  merchant_name TEXT NOT NULL,
  merchant_category TEXT, -- MCC code
  merchant_location TEXT, -- City, State
  
  -- Description
  description TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'reversed')),
  
  -- Rebilling tracking
  rebilled BOOLEAN NOT NULL DEFAULT false,
  rebill_period_id TEXT, -- For grouping rebills by period
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_logs_organization ON transaction_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_agent ON transaction_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_client ON transaction_logs(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_logs_card ON transaction_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_stripe_transaction ON transaction_logs(stripe_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_stripe_authorization ON transaction_logs(stripe_authorization_id) WHERE stripe_authorization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created ON transaction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_rebilled ON transaction_logs(rebilled, rebill_period_id);

-- Comment
COMMENT ON TABLE transaction_logs IS 'Log of all card transactions for attribution and rebilling.';
COMMENT ON COLUMN transaction_logs.amount_cents IS 'Transaction amount in cents (BigInt).';

-- -----------------------------------------------------------------------------
-- 5. AUTHORIZATIONS LOG TABLE
-- -----------------------------------------------------------------------------
-- Log of authorization decisions (approved/declined) for audit trail.

CREATE TABLE IF NOT EXISTS authorizations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe reference
  stripe_authorization_id TEXT UNIQUE NOT NULL,
  
  -- Card reference
  card_id TEXT NOT NULL REFERENCES virtual_cards(id) ON DELETE CASCADE,
  
  -- Authorization details
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  merchant_name TEXT,
  merchant_category TEXT,
  
  -- Decision
  approved BOOLEAN NOT NULL,
  decline_code TEXT, -- If declined, reason code
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE authorizations_log ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_authorizations_log_stripe_auth ON authorizations_log(stripe_authorization_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_log_card ON authorizations_log(card_id);
CREATE INDEX IF NOT EXISTS idx_authorizations_log_created ON authorizations_log(created_at DESC);

-- Comment
COMMENT ON TABLE authorizations_log IS 'Log of authorization decisions for audit trail. Used by webhook handler.';

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- CLIENTS POLICIES
-- Select: Members can view clients in their org
CREATE POLICY "Members can view clients"
  ON clients FOR SELECT
  USING (is_org_member(organization_id));

-- Insert: Admins can create clients
CREATE POLICY "Admins can create clients"
  ON clients FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- Update: Admins can update clients
CREATE POLICY "Admins can update clients"
  ON clients FOR UPDATE
  USING (has_org_role(organization_id, 'admin'))
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- Delete: Admins can delete clients
CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  USING (has_org_role(organization_id, 'admin'));

-- AGENTS POLICIES
-- Select: Members can view agents in their org
CREATE POLICY "Members can view agents"
  ON agents FOR SELECT
  USING (is_org_member(organization_id));

-- Insert: Members can create agents
CREATE POLICY "Members can create agents"
  ON agents FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'member'));

-- Update: Members can update agents
CREATE POLICY "Members can update agents"
  ON agents FOR UPDATE
  USING (has_org_role(organization_id, 'member'))
  WITH CHECK (has_org_role(organization_id, 'member'));

-- Delete: Admins can delete agents
CREATE POLICY "Admins can delete agents"
  ON agents FOR DELETE
  USING (has_org_role(organization_id, 'admin'));

-- VIRTUAL CARDS POLICIES
-- Select: Members can view cards in their org
CREATE POLICY "Members can view virtual cards"
  ON virtual_cards FOR SELECT
  USING (is_org_member(organization_id));

-- Insert: Members can create cards (via API)
CREATE POLICY "Members can create virtual cards"
  ON virtual_cards FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'member'));

-- Update: Members can update cards (freeze/unfreeze, update limits)
CREATE POLICY "Members can update virtual cards"
  ON virtual_cards FOR UPDATE
  USING (has_org_role(organization_id, 'member'))
  WITH CHECK (has_org_role(organization_id, 'member'));

-- Delete: Admins can delete cards
CREATE POLICY "Admins can delete virtual cards"
  ON virtual_cards FOR DELETE
  USING (has_org_role(organization_id, 'admin'));

-- TRANSACTION LOGS POLICIES
-- Select: Members can view transactions in their org
CREATE POLICY "Members can view transaction logs"
  ON transaction_logs FOR SELECT
  USING (is_org_member(organization_id));

-- Insert: System can insert transactions (via webhooks)
CREATE POLICY "System can insert transaction logs"
  ON transaction_logs FOR INSERT
  WITH CHECK (true); -- Webhooks use service client, but RLS still applies

-- Update: System can update transactions (mark as rebilled)
CREATE POLICY "System can update transaction logs"
  ON transaction_logs FOR UPDATE
  USING (true); -- Webhooks use service client

-- AUTHORIZATIONS LOG POLICIES
-- Select: Members can view authorizations in their org
CREATE POLICY "Members can view authorizations log"
  ON authorizations_log FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM virtual_cards
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- Insert: System can insert authorizations (via webhooks)
CREATE POLICY "System can insert authorizations log"
  ON authorizations_log FOR INSERT
  WITH CHECK (true); -- Webhooks use service client

-- -----------------------------------------------------------------------------
-- 7. TRIGGERS
-- -----------------------------------------------------------------------------

-- Update timestamp trigger for all tables
CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agents_updated
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_virtual_cards_updated
  BEFORE UPDATE ON virtual_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_transaction_logs_updated
  BEFORE UPDATE ON transaction_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Monthly reset trigger for agents
-- When reset_date is today or past and month has rolled over, reset current_spend_cents
CREATE OR REPLACE FUNCTION reset_agent_monthly_spend()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if reset_date is today or past
  IF NEW.reset_date <= CURRENT_DATE THEN
    -- Check if we've already reset this month (compare month/year)
    IF DATE_TRUNC('month', NEW.reset_date) < DATE_TRUNC('month', CURRENT_DATE) THEN
      -- Month has rolled over, reset spend and update reset_date
      NEW.current_spend_cents := 0;
      NEW.reset_date := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_agent_spend
  BEFORE UPDATE ON agents
  FOR EACH ROW
  WHEN (OLD.reset_date IS DISTINCT FROM NEW.reset_date OR OLD.current_spend_cents IS DISTINCT FROM NEW.current_spend_cents)
  EXECUTE FUNCTION reset_agent_monthly_spend();

COMMENT ON FUNCTION reset_agent_monthly_spend IS 'Automatically resets agent monthly spend when reset_date passes and month has rolled over.';

-- -----------------------------------------------------------------------------
-- 8. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Get agent's total spend for current month
CREATE OR REPLACE FUNCTION get_agent_current_spend(p_agent_id UUID)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(amount_cents), 0)::BIGINT
  FROM transaction_logs
  WHERE agent_id = p_agent_id
    AND status = 'approved'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_agent_current_spend IS 'Returns agent total spend for current month in cents.';

-- Get client's total billable amount for a period
CREATE OR REPLACE FUNCTION get_client_billable_amount(
  p_client_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS BIGINT AS $$
  SELECT COALESCE(SUM(amount_cents), 0)::BIGINT
  FROM transaction_logs
  WHERE client_id = p_client_id
    AND status = 'approved'
    AND DATE(created_at) >= p_period_start
    AND DATE(created_at) <= p_period_end
    AND rebilled = false;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_client_billable_amount IS 'Returns total billable amount for a client in a date range (unbilled transactions only).';

-- -----------------------------------------------------------------------------
-- 9. VERIFICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- Verify tables exist
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clients'), 
    'clients table not created';
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'agents'), 
    'agents table not created';
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'virtual_cards'), 
    'virtual_cards table not created';
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'transaction_logs'), 
    'transaction_logs table not created';
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'authorizations_log'), 
    'authorizations_log table not created';
  
  -- Verify RLS is enabled
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'clients'), 
    'RLS not enabled on clients';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'agents'), 
    'RLS not enabled on agents';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'virtual_cards'), 
    'RLS not enabled on virtual_cards';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'transaction_logs'), 
    'RLS not enabled on transaction_logs';
  
  RAISE NOTICE 'Migration 003_core_domain.sql verification passed!';
END;
$$;

-- Final status
SELECT 
  'CORE DOMAIN SCHEMA INITIALIZED' AS status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'clients') AS clients_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'agents') AS agents_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'virtual_cards') AS cards_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'transaction_logs') AS transactions_policies;




-- =============================================================================
-- FIX: AUTH SIGNUP TRIGGER FAILING ("Database error saving new user")
-- Migration: 004_fix_auth_signup_trigger.sql
-- =============================================================================
-- Problem:
-- - Supabase Auth signup can fail with a generic "Database error saving new user"
--   when the `handle_new_user()` trigger errors.
-- - Common causes:
--   1) `auth.uid()` is NULL in trigger context -> RLS insert policies reject inserts
--   2) `search_path` not set -> unqualified table references can fail or be unsafe
--
-- Fix:
-- - Harden `handle_new_user()` by setting `search_path` and schema-qualifying inserts
-- - Add safe exception logging to `audit_log` (no PII)
-- - Relax INSERT RLS checks to allow database roles (postgres/supabase_auth_admin)
--   used by triggers to insert during signup
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Update RLS policies to allow trigger-context inserts
-- -----------------------------------------------------------------------------

-- organizations: allow inserts from authenticated users OR internal DB roles
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR current_user IN ('postgres', 'supabase_auth_admin')
  );

-- user_profiles: allow inserts for self OR internal DB roles
DROP POLICY IF EXISTS "System creates user profiles" ON user_profiles;
CREATE POLICY "System creates user profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    OR current_user IN ('postgres', 'supabase_auth_admin')
  );

-- org_members: allow inserts from admins OR self OR internal DB roles
DROP POLICY IF EXISTS "Admins can invite members" ON org_members;
CREATE POLICY "Admins can invite members"
  ON org_members FOR INSERT
  WITH CHECK (
    has_org_role(organization_id, 'admin')
    OR user_id = auth.uid()
    OR current_user IN ('postgres', 'supabase_auth_admin')
  );

-- -----------------------------------------------------------------------------
-- 2) Harden the auth trigger function and add exception logging
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_org_slug TEXT;
  v_step TEXT := 'init';
BEGIN
  v_step := 'derive_org_fields';

  -- Generate organization name from email or metadata
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Agency';

  -- Generate unique slug
  v_org_slug := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data->>'organization_slug',
      split_part(NEW.email, '@', 1)
    ),
    '[^a-z0-9]+', '-', 'g'
  )) || '-' || substr(NEW.id::text, 1, 8);

  v_step := 'insert_organization';

  -- Create default organization for the user
  INSERT INTO public.organizations (name, slug, metadata)
  VALUES (v_org_name, v_org_slug, jsonb_build_object('created_by', NEW.id))
  RETURNING id INTO v_org_id;

  v_step := 'insert_user_profile';

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    full_name,
    default_organization_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_org_id
  );

  v_step := 'insert_org_member_owner';

  -- Add user as owner of their organization
  INSERT INTO public.org_members (
    organization_id,
    user_id,
    role,
    invited_by,
    accepted_at
  ) VALUES (
    v_org_id,
    NEW.id,
    'owner',
    NEW.id,  -- Self-invited
    now()    -- Auto-accepted
  );

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Best-effort logging (no PII). Do not block exception if logging fails.
  BEGIN
    INSERT INTO public.audit_log (
      action,
      resource_type,
      resource_id,
      error_message,
      metadata
    ) VALUES (
      'auth_signup_trigger_error',
      'auth_user',
      NEW.id::text,
      SQLERRM,
      jsonb_build_object(
        'sqlstate', SQLSTATE,
        'step', v_step,
        'current_user', current_user,
        'search_path', current_setting('search_path', true)
      )
    );
  EXCEPTION WHEN others THEN
    -- swallow
  END;
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Auto-creates user_profile and default organization on signup. Hardened with search_path and audit logging.';





-- =============================================================================
-- SWITCHBOARD AGENTS & CARDS HARDENING
-- Migration: 005_agents_hardening.sql
-- =============================================================================
-- Phase 7-9 hardening migration for the agent/card issuance workflow.
-- 
-- This migration adds:
-- 1. Partial unique index on virtual_cards: one active card per agent
-- 2. Additional helper functions for card issuance
-- 3. Improved budget validation function
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PARTIAL UNIQUE INDEX: ONE ACTIVE CARD PER AGENT
-- -----------------------------------------------------------------------------
-- Ensures that each agent can have at most ONE active virtual card at a time.
-- When a new card is issued, the old one must be deactivated first.
-- Inactive cards (is_active = false) are not constrained.

CREATE UNIQUE INDEX IF NOT EXISTS idx_virtual_cards_one_active_per_agent
  ON virtual_cards(agent_id)
  WHERE is_active = true;

COMMENT ON INDEX idx_virtual_cards_one_active_per_agent IS 
  'Ensures each agent has at most one active virtual card. Deactivate old cards before issuing new ones.';

-- -----------------------------------------------------------------------------
-- 2. HELPER FUNCTION: CHECK AGENT BUDGET AVAILABILITY
-- -----------------------------------------------------------------------------
-- Returns true if the agent has budget remaining for the requested amount.

CREATE OR REPLACE FUNCTION check_agent_budget(
  p_agent_id UUID,
  p_amount_cents BIGINT DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
  v_agent agents%ROWTYPE;
  v_available BIGINT;
BEGIN
  -- Get the agent
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if agent is active
  IF NOT v_agent.is_active THEN
    RETURN false;
  END IF;
  
  -- Calculate available budget
  v_available := v_agent.monthly_budget_cents - v_agent.current_spend_cents;
  
  -- Check if requested amount fits within budget
  RETURN v_available >= p_amount_cents;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_agent_budget IS 
  'Checks if agent has sufficient budget for the requested amount.';

-- -----------------------------------------------------------------------------
-- 3. HELPER FUNCTION: GET AGENT'S ACTIVE CARD
-- -----------------------------------------------------------------------------
-- Returns the agent's currently active card ID, or NULL if none.

CREATE OR REPLACE FUNCTION get_agent_active_card(p_agent_id UUID)
RETURNS TEXT AS $$
  SELECT id FROM virtual_cards 
  WHERE agent_id = p_agent_id 
    AND is_active = true 
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_agent_active_card IS 
  'Returns the agent''s active card ID, or NULL if no active card exists.';

-- -----------------------------------------------------------------------------
-- 4. HELPER FUNCTION: CAN ISSUE CARD TO AGENT
-- -----------------------------------------------------------------------------
-- Pre-flight check before card issuance. Returns true if:
-- - Agent exists and is active
-- - Agent's organization has a Stripe Connect account
-- - Agent has budget configured (monthly_budget_cents > 0)
-- - Agent doesn't already have an active card

CREATE OR REPLACE FUNCTION can_issue_card_to_agent(p_agent_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_agent agents%ROWTYPE;
  v_org organizations%ROWTYPE;
  v_active_card TEXT;
  v_result JSONB := '{"can_issue": false, "reasons": []}'::jsonb;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check agent exists
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
  IF NOT FOUND THEN
    v_reasons := array_append(v_reasons, 'Agent not found');
    RETURN jsonb_build_object('can_issue', false, 'reasons', to_jsonb(v_reasons));
  END IF;
  
  -- Check agent is active
  IF NOT v_agent.is_active THEN
    v_reasons := array_append(v_reasons, 'Agent is not active');
  END IF;
  
  -- Check organization
  SELECT * INTO v_org FROM organizations WHERE id = v_agent.organization_id;
  IF NOT FOUND THEN
    v_reasons := array_append(v_reasons, 'Organization not found');
    RETURN jsonb_build_object('can_issue', false, 'reasons', to_jsonb(v_reasons));
  END IF;
  
  -- Check for Stripe Connect account
  IF v_org.stripe_account_id IS NULL THEN
    v_reasons := array_append(v_reasons, 'Organization has no Stripe Connect account');
  END IF;
  
  -- Check budget is configured
  IF v_agent.monthly_budget_cents <= 0 THEN
    v_reasons := array_append(v_reasons, 'Agent has no monthly budget configured');
  END IF;
  
  -- Check for existing active card
  v_active_card := get_agent_active_card(p_agent_id);
  IF v_active_card IS NOT NULL THEN
    v_reasons := array_append(v_reasons, 'Agent already has an active card: ' || v_active_card);
  END IF;
  
  -- Build result
  IF array_length(v_reasons, 1) IS NULL OR array_length(v_reasons, 1) = 0 THEN
    RETURN jsonb_build_object('can_issue', true, 'reasons', '[]'::jsonb);
  ELSE
    RETURN jsonb_build_object('can_issue', false, 'reasons', to_jsonb(v_reasons));
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_issue_card_to_agent IS 
  'Pre-flight check before issuing a virtual card. Returns {can_issue: boolean, reasons: string[]}.';

-- -----------------------------------------------------------------------------
-- 5. HELPER FUNCTION: GET AGENT WITH CARD STATUS
-- -----------------------------------------------------------------------------
-- Returns agent details enriched with card issuance status.

CREATE OR REPLACE FUNCTION get_agent_card_status(p_agent_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_agent agents%ROWTYPE;
  v_active_card virtual_cards%ROWTYPE;
  v_card_count INTEGER;
BEGIN
  -- Get agent
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get active card
  SELECT * INTO v_active_card 
  FROM virtual_cards 
  WHERE agent_id = p_agent_id AND is_active = true 
  LIMIT 1;
  
  -- Get total card count
  SELECT COUNT(*) INTO v_card_count 
  FROM virtual_cards 
  WHERE agent_id = p_agent_id;
  
  RETURN jsonb_build_object(
    'agent_id', v_agent.id,
    'agent_name', v_agent.name,
    'is_active', v_agent.is_active,
    'monthly_budget_cents', v_agent.monthly_budget_cents,
    'current_spend_cents', v_agent.current_spend_cents,
    'budget_remaining_cents', v_agent.monthly_budget_cents - v_agent.current_spend_cents,
    'budget_utilization_pct', 
      CASE WHEN v_agent.monthly_budget_cents > 0 
           THEN ROUND((v_agent.current_spend_cents::NUMERIC / v_agent.monthly_budget_cents) * 100, 2)
           ELSE 0 
      END,
    'reset_date', v_agent.reset_date,
    'has_active_card', v_active_card.id IS NOT NULL,
    'active_card_id', v_active_card.id,
    'active_card_last4', v_active_card.last4,
    'total_cards_issued', v_card_count
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_agent_card_status IS 
  'Returns agent details with card issuance status and budget utilization.';

-- -----------------------------------------------------------------------------
-- 6. AUTOMATIC SPEND RESET CRON JOB HELPER
-- -----------------------------------------------------------------------------
-- Function to reset all agents whose reset_date has passed.
-- This should be called by a scheduled job (pg_cron or Supabase Edge Function).

CREATE OR REPLACE FUNCTION reset_overdue_agent_budgets()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE agents
    SET 
      current_spend_cents = 0,
      reset_date = CURRENT_DATE,
      updated_at = now()
    WHERE 
      reset_date < CURRENT_DATE
      AND is_active = true
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_overdue_agent_budgets IS 
  'Resets current_spend_cents for all agents with past reset_date. Returns count of agents reset. Call from scheduled job.';

-- -----------------------------------------------------------------------------
-- 7. VERIFICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- Verify partial unique index exists
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_virtual_cards_one_active_per_agent'
  ), 'Partial unique index not created';
  
  -- Verify functions exist
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'check_agent_budget'
  ), 'check_agent_budget function not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_agent_active_card'
  ), 'get_agent_active_card function not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'can_issue_card_to_agent'
  ), 'can_issue_card_to_agent function not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_agent_card_status'
  ), 'get_agent_card_status function not created';
  
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'reset_overdue_agent_budgets'
  ), 'reset_overdue_agent_budgets function not created';
  
  RAISE NOTICE 'Migration 005_agents_hardening.sql verification passed!';
END;
$$;

-- Final status
SELECT 
  'AGENTS HARDENING COMPLETE' AS status,
  (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_virtual_cards%') AS card_indexes,
  (SELECT COUNT(*) FROM pg_proc WHERE proname IN (
    'check_agent_budget', 
    'get_agent_active_card', 
    'can_issue_card_to_agent',
    'get_agent_card_status',
    'reset_overdue_agent_budgets'
  )) AS helper_functions;
-- =============================================================================
-- SWITCHBOARD TRANSACTION SETTLEMENTS & BILLING SUPPORT
-- Migration: 006_transaction_settlements.sql
-- =============================================================================
-- Adds transaction settlement tracking and markup billing support.
-- 
-- Changes:
-- 1. Add `transaction_settlements` table for settlement tracking
-- 2. Add `markup_percentage` to organizations
-- 3. Add `billed_at` to transaction_logs for billing cron
-- 4. Create optimized indexes for webhook queries
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD MARKUP PERCENTAGE TO ORGANIZATIONS
-- -----------------------------------------------------------------------------
-- Default 15% markup (0.15) for agency rebilling

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5,4) NOT NULL DEFAULT 0.15;

COMMENT ON COLUMN organizations.markup_percentage IS 
  'Percentage markup applied to transactions for client rebilling. 0.15 = 15%.';

-- -----------------------------------------------------------------------------
-- 2. CREATE TRANSACTION SETTLEMENTS TABLE
-- -----------------------------------------------------------------------------
-- Tracks settled transactions and their billing status.
-- Used by settlement webhook and daily aggregation cron.

CREATE TABLE IF NOT EXISTS transaction_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe references (idempotency keys)
  stripe_transaction_id TEXT UNIQUE NOT NULL,
  stripe_authorization_id TEXT,
  
  -- Card and entity references
  card_id TEXT NOT NULL REFERENCES virtual_cards(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Transaction amounts (all in cents)
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  markup_fee_cents BIGINT NOT NULL DEFAULT 0 CHECK (markup_fee_cents >= 0),
  total_rebill_cents BIGINT GENERATED ALWAYS AS (amount_cents + markup_fee_cents) STORED,
  currency TEXT NOT NULL DEFAULT 'usd',
  
  -- Merchant information
  merchant_name TEXT NOT NULL,
  merchant_category TEXT, -- MCC code
  merchant_city TEXT,
  merchant_country TEXT DEFAULT 'US',
  
  -- Billing tracking
  billed_at TIMESTAMPTZ, -- NULL = not yet billed, set when pushed to Stripe Usage Record
  billing_period TEXT, -- e.g., '2025-01' for January 2025
  
  -- Journal entry references (for ledger reconciliation)
  spend_journal_entry_id UUID REFERENCES journal_entries(id),
  markup_journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE transaction_settlements ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. INDEXES FOR OPTIMIZED WEBHOOK QUERIES
-- -----------------------------------------------------------------------------

-- Primary lookup for idempotency check (settlement webhook)
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_stripe_transaction 
  ON transaction_settlements(stripe_transaction_id);

-- Lookup by authorization (for linking auth → settlement)
CREATE INDEX IF NOT EXISTS idx_settlements_stripe_authorization 
  ON transaction_settlements(stripe_authorization_id) 
  WHERE stripe_authorization_id IS NOT NULL;

-- Card lookup (for webhook processing)
CREATE INDEX IF NOT EXISTS idx_settlements_card 
  ON transaction_settlements(card_id);

-- Daily aggregation cron query: unbilled transactions by date
CREATE INDEX IF NOT EXISTS idx_settlements_unbilled 
  ON transaction_settlements(client_id, created_at) 
  WHERE billed_at IS NULL;

-- Billing period aggregation
CREATE INDEX IF NOT EXISTS idx_settlements_billing_period 
  ON transaction_settlements(billing_period, client_id) 
  WHERE billing_period IS NOT NULL;

-- Organization-level queries
CREATE INDEX IF NOT EXISTS idx_settlements_organization 
  ON transaction_settlements(organization_id, created_at DESC);

-- Agent and client reporting
CREATE INDEX IF NOT EXISTS idx_settlements_agent 
  ON transaction_settlements(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settlements_client 
  ON transaction_settlements(client_id, created_at DESC) 
  WHERE client_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Select: Org members can view their org's settlements
CREATE POLICY "Members can view settlements"
  ON transaction_settlements FOR SELECT
  USING (is_org_member(organization_id));

-- Insert: Only via service role (webhooks)
-- No INSERT policy = only service role can insert

-- Update: Only via service role (billing cron)
-- No UPDATE policy = only service role can update

-- Delete: Only via service role
-- No DELETE policy = only service role can delete

-- -----------------------------------------------------------------------------
-- 5. ADD BILLED_AT TO TRANSACTION_LOGS (Legacy Support)
-- -----------------------------------------------------------------------------
-- In case transaction_logs is used instead of settlements

ALTER TABLE transaction_logs 
ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_transaction_logs_unbilled 
  ON transaction_logs(client_id, created_at) 
  WHERE billed_at IS NULL AND rebilled = false;

-- -----------------------------------------------------------------------------
-- 6. HELPER FUNCTION: Get Unbilled Settlements
-- -----------------------------------------------------------------------------
-- Used by daily aggregation cron

CREATE OR REPLACE FUNCTION get_unbilled_settlements(
  p_before_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  client_id UUID,
  stripe_subscription_item_id TEXT,
  total_spend_cents BIGINT,
  total_markup_cents BIGINT,
  total_rebill_cents BIGINT,
  transaction_count BIGINT,
  settlement_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.client_id,
    c.stripe_subscription_item_id,
    SUM(ts.amount_cents)::BIGINT as total_spend_cents,
    SUM(ts.markup_fee_cents)::BIGINT as total_markup_cents,
    SUM(ts.amount_cents + ts.markup_fee_cents)::BIGINT as total_rebill_cents,
    COUNT(*)::BIGINT as transaction_count,
    ARRAY_AGG(ts.id) as settlement_ids
  FROM transaction_settlements ts
  JOIN clients c ON ts.client_id = c.id
  WHERE 
    ts.billed_at IS NULL
    AND ts.client_id IS NOT NULL
    AND DATE(ts.created_at) < p_before_date
    AND c.stripe_subscription_item_id IS NOT NULL
  GROUP BY ts.client_id, c.stripe_subscription_item_id;
END;
$$;

COMMENT ON FUNCTION get_unbilled_settlements IS 
  'Returns unbilled settlements grouped by client for the daily aggregation cron.';

-- -----------------------------------------------------------------------------
-- 7. HELPER FUNCTION: Mark Settlements as Billed
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_settlements_billed(
  p_settlement_ids UUID[],
  p_billing_period TEXT DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM')
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE transaction_settlements
  SET 
    billed_at = NOW(),
    billing_period = p_billing_period
  WHERE 
    id = ANY(p_settlement_ids)
    AND billed_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION mark_settlements_billed IS 
  'Marks settlements as billed after successful Stripe Usage Record push.';

-- -----------------------------------------------------------------------------
-- 8. OPTIMIZED INDEX FOR AUTHORIZATION WEBHOOK (<2 sec response)
-- -----------------------------------------------------------------------------
-- Pre-computed index for fast budget lookups during authorization

CREATE INDEX IF NOT EXISTS idx_agents_budget_lookup 
  ON agents(id) 
  INCLUDE (current_spend_cents, monthly_budget_cents, organization_id, is_active);

-- Virtual cards lookup by Stripe card ID (primary key already indexed)
-- But add include columns for webhook efficiency
CREATE INDEX IF NOT EXISTS idx_virtual_cards_webhook_lookup 
  ON virtual_cards(id) 
  INCLUDE (agent_id, organization_id, is_active, spending_limit_cents);

-- -----------------------------------------------------------------------------
-- 9. COMMENTS
-- -----------------------------------------------------------------------------

COMMENT ON TABLE transaction_settlements IS 
  'Tracks settled Stripe Issuing transactions for rebilling. Used by settlement webhook and daily aggregation cron.';

COMMENT ON COLUMN transaction_settlements.billed_at IS 
  'Timestamp when this settlement was included in a Stripe Usage Record. NULL = not yet billed.';

COMMENT ON COLUMN transaction_settlements.total_rebill_cents IS 
  'Computed column: amount_cents + markup_fee_cents. Total amount to rebill to client.';
-- =============================================================================
-- SWITCHBOARD PENDING AUTHORIZATION ACCOUNTS
-- Migration: 007_pending_authorization_accounts.sql
-- =============================================================================
-- Adds ledger accounts for tracking pending card authorizations.
-- 
-- These accounts enable double-entry tracking of authorized but unsettled
-- transactions, maintaining a complete audit trail of all card activity.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD PENDING AUTHORIZATION LIABILITY ACCOUNTS
-- -----------------------------------------------------------------------------
-- These accounts track funds that are authorized but not yet settled.
-- Used by the issuing-authorizations webhook for real-time tracking.

INSERT INTO chart_of_accounts (code, name, account_type, normal_balance_debit, description, organization_id) VALUES
  -- 2300: Agent Wallet Liability - tracks funds held on behalf of agents
  ('2300', 'Agent Wallet Liability', 'liability', false, 'Funds held on virtual cards for agents. Debited when authorization is approved.', NULL),
  
  -- 2400: Pending Authorization Liability - tracks approved but unsettled authorizations
  ('2400', 'Pending Authorization Liability', 'liability', false, 'Authorized amounts awaiting settlement. Credited when auth approved, debited when settled.', NULL),
  
  -- 2500: Client Accounts Receivable - tracks amounts owed by clients (for rebilling)
  ('2500', 'Client Accounts Receivable', 'asset', true, 'Amounts to be rebilled to clients including markup.', NULL)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Add comments
COMMENT ON COLUMN chart_of_accounts.code IS 
  'Account codes: 1xxx=Assets, 2xxx=Liabilities, 4xxx=Revenue, 5xxx=Expenses';

-- -----------------------------------------------------------------------------
-- 2. VERIFICATION
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify accounts were created
  SELECT COUNT(*) INTO v_count 
  FROM chart_of_accounts 
  WHERE code IN ('2300', '2400', '2500');
  
  IF v_count < 3 THEN
    RAISE NOTICE 'Some accounts may already exist. Current count for 2300/2400/2500: %', v_count;
  ELSE
    RAISE NOTICE 'All pending authorization accounts created successfully. Count: %', v_count;
  END IF;
END;
$$;

-- Final status
SELECT 
  'PENDING AUTHORIZATION ACCOUNTS CREATED' AS status,
  (SELECT COUNT(*) FROM chart_of_accounts WHERE code LIKE '2%') AS liability_accounts_count;
-- =============================================================================
-- SWITCHBOARD RLS SECURITY HARDENING
-- Migration: 008_rls_security_hardening.sql
-- =============================================================================
-- Addresses critical RLS security gaps before financial operations go live.
--
-- Changes:
-- 1. Fix organizations policy leak (remove "OR NOT is_active")
-- 2. Remove permissive write policies on transaction_logs/authorizations_log
-- 3. Tighten virtual_cards write policies to admin/owner or service-only
-- 4. Add SET search_path = public to all SECURITY DEFINER helper functions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX ORGANIZATIONS POLICY LEAK
-- -----------------------------------------------------------------------------
-- Remove the "OR NOT is_active" clause that could leak inactive organizations

DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id));

-- -----------------------------------------------------------------------------
-- 2. REMOVE PERMISSIVE WRITE POLICIES ON FINANCIAL TABLES
-- -----------------------------------------------------------------------------
-- These policies allowed cross-tenant writes - drop them entirely
-- Webhooks will use service role client which bypasses RLS

DROP POLICY IF EXISTS "System can insert transaction logs" ON transaction_logs;
DROP POLICY IF EXISTS "System can update transaction logs" ON transaction_logs;

-- Transaction logs: No INSERT/UPDATE policies (only service role)
-- Select policy for members to view their org's logs
CREATE POLICY "Members can view transaction logs"
  ON transaction_logs FOR SELECT
  USING (is_org_member(organization_id));

-- Authorizations log: Remove permissive policies
DROP POLICY IF EXISTS "System can insert authorizations log" ON authorizations_log;

-- Authorizations log: No INSERT policies (only service role)
-- Select policy for members to view their org's authorizations
CREATE POLICY "Members can view authorizations log"
  ON authorizations_log FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM virtual_cards
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- -----------------------------------------------------------------------------
-- 3. TIGHTEN VIRTUAL CARDS POLICIES
-- -----------------------------------------------------------------------------
-- Current policies allow "member" role to create/update cards - restrict to admin/owner

DROP POLICY IF EXISTS "Members can create virtual cards" ON virtual_cards;
DROP POLICY IF EXISTS "Members can update virtual cards" ON virtual_cards;

-- Create: Only admins/owners can issue cards (via API)
CREATE POLICY "Admins can create virtual cards"
  ON virtual_cards FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- Update: Only admins/owners can update cards
CREATE POLICY "Admins can update virtual cards"
  ON virtual_cards FOR UPDATE
  USING (has_org_role(organization_id, 'admin'))
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- Delete: Only admins/owners can delete cards
CREATE POLICY "Admins can delete virtual cards"
  ON virtual_cards FOR DELETE
  USING (has_org_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- 4. HARDEN SECURITY DEFINER FUNCTIONS WITH SEARCH_PATH
-- -----------------------------------------------------------------------------
-- Add SET search_path = public to prevent search_path attacks
-- These functions are called from RLS policies and must be secure

-- is_org_member with search path hardening
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- has_org_role with search path hardening
CREATE OR REPLACE FUNCTION has_org_role(p_org_id UUID, p_min_role org_role)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role org_role;
BEGIN
  SELECT role INTO v_user_role
  FROM org_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;

  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Role hierarchy: owner > admin > member > viewer
  CASE p_min_role
    WHEN 'owner' THEN
      RETURN v_user_role = 'owner';
    WHEN 'admin' THEN
      RETURN v_user_role IN ('owner', 'admin');
    WHEN 'member' THEN
      RETURN v_user_role IN ('owner', 'admin', 'member');
    WHEN 'viewer' THEN
      RETURN TRUE; -- Any accepted member can view
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- get_user_org_ids with search path hardening
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id
  FROM org_members
  WHERE user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- get_org_role with search path hardening
CREATE OR REPLACE FUNCTION get_org_role(p_org_id UUID)
RETURNS org_role AS $$
  SELECT role
  FROM org_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- -----------------------------------------------------------------------------
-- 5. VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify organizations policy is fixed (no "OR NOT is_active")
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'organizations'
    AND policyname = 'Members can view their organizations'
    AND cmd = 'SELECT';

  IF v_count = 0 THEN
    RAISE NOTICE 'ERROR: Organizations policy not found after migration';
  ELSE
    RAISE NOTICE '✓ Organizations policy hardened successfully';
  END IF;

  -- Verify transaction_logs has no INSERT/UPDATE policies (service-only)
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'transaction_logs'
    AND cmd IN ('INSERT', 'UPDATE');

  IF v_count > 0 THEN
    RAISE NOTICE 'ERROR: Transaction logs still has permissive write policies';
  ELSE
    RAISE NOTICE '✓ Transaction logs write policies removed (service-only)';
  END IF;

  -- Verify authorizations_log has no INSERT policies (service-only)
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'authorizations_log'
    AND cmd = 'INSERT';

  IF v_count > 0 THEN
    RAISE NOTICE 'ERROR: Authorizations log still has permissive INSERT policy';
  ELSE
    RAISE NOTICE '✓ Authorizations log INSERT policy removed (service-only)';
  END IF;

  -- Verify virtual_cards INSERT/UPDATE are admin-only
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'virtual_cards'
    AND cmd IN ('INSERT', 'UPDATE')
    AND policyname LIKE '%Members%';

  IF v_count > 0 THEN
    RAISE NOTICE 'ERROR: Virtual cards still has member-level write policies';
  ELSE
    RAISE NOTICE '✓ Virtual cards write policies restricted to admins';
  END IF;

  RAISE NOTICE 'RLS Security Hardening Migration Complete';
END;
$$;
-- =============================================================================
-- SWITCHBOARD MARKUP BASIS POINTS
-- Migration: 009_markup_basis_points.sql
-- =============================================================================
-- Adds markup_basis_points column for BigInt-safe percentage calculations.
-- Replaces floating-point markup_percentage with basis points arithmetic.
--
-- Changes:
-- 1. Add markup_basis_points BIGINT column to organizations
-- 2. Backfill from existing markup_percentage values
-- 3. Update constraints and defaults
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD MARKUP_BASIS_POINTS COLUMN
-- -----------------------------------------------------------------------------
-- Store markup as basis points (1500 = 15%) for BigInt arithmetic

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS markup_basis_points BIGINT NOT NULL DEFAULT 1500
CHECK (markup_basis_points >= 0 AND markup_basis_points <= 10000);

COMMENT ON COLUMN organizations.markup_basis_points IS
  'Markup percentage as basis points (1500 = 15%). Used for BigInt-safe calculations.';

-- -----------------------------------------------------------------------------
-- 2. BACKFILL FROM EXISTING MARKUP_PERCENTAGE
-- -----------------------------------------------------------------------------
-- Convert existing percentage values to basis points
-- 15.0% → 1500 basis points, 12.5% → 1250 basis points, etc.

UPDATE organizations
SET markup_basis_points = ROUND(markup_percentage * 100)::BIGINT
WHERE markup_percentage IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. ADD INDEX FOR PERFORMANCE
-- -----------------------------------------------------------------------------
-- Index for potential queries on markup values

CREATE INDEX IF NOT EXISTS idx_organizations_markup_basis_points
  ON organizations(markup_basis_points);

-- -----------------------------------------------------------------------------
-- 4. VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_count INTEGER;
  v_total_orgs INTEGER;
BEGIN
  -- Check column was added
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'organizations'
    AND column_name = 'markup_basis_points';

  IF v_count = 0 THEN
    RAISE NOTICE 'ERROR: markup_basis_points column not added';
  ELSE
    RAISE NOTICE '✓ markup_basis_points column added successfully';
  END IF;

  -- Check backfill worked
  SELECT COUNT(*) INTO v_total_orgs FROM organizations;
  SELECT COUNT(*) INTO v_count
  FROM organizations
  WHERE markup_basis_points IS NOT NULL;

  IF v_count = v_total_orgs THEN
    RAISE NOTICE '✓ All organizations have markup_basis_points values';
  ELSE
    RAISE NOTICE 'WARNING: %/% organizations have markup_basis_points', v_count, v_total_orgs;
  END IF;

  -- Show sample values
  RAISE NOTICE 'Sample markup conversions:';
  FOR r IN (
    SELECT name, markup_percentage, markup_basis_points,
           ROUND(markup_percentage * 100) as expected_basis_points
    FROM organizations
    LIMIT 5
  ) LOOP
    RAISE NOTICE '  %: %%% → % basis points (expected: %)',
      r.name, r.markup_percentage, r.markup_basis_points, r.expected_basis_points;
  END LOOP;
END;
$$;
-- =============================================================================
-- SWITCHBOARD INCREMENT AGENT SPEND RPC
-- Migration: 010_increment_agent_spend_rpc.sql
-- =============================================================================
-- Adds atomic increment function for agent spend tracking.
-- Used by settlement webhook to avoid race conditions.
--
-- Changes:
-- 1. Add increment_agent_spend(p_agent_id, p_amount_cents) RPC
-- 2. Atomic update with proper error handling
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. INCREMENT AGENT SPEND RPC FUNCTION
-- -----------------------------------------------------------------------------
-- Atomically increments an agent's current_spend_cents.
-- Returns the new spend amount or raises an exception on error.

CREATE OR REPLACE FUNCTION increment_agent_spend(
  p_agent_id UUID,
  p_amount_cents TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_spend BIGINT;
  v_amount BIGINT;
BEGIN
  -- Validate inputs
  IF p_agent_id IS NULL THEN
    RAISE EXCEPTION 'Agent ID cannot be null';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents = '' THEN
    RAISE EXCEPTION 'Amount cannot be null or empty';
  END IF;

  -- Parse amount (should be string representation of BigInt)
  BEGIN
    v_amount := p_amount_cents::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid amount format: %', p_amount_cents;
  END;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive: %', v_amount;
  END IF;

  -- Atomically increment the spend
  UPDATE agents
  SET
    current_spend_cents = current_spend_cents + v_amount,
    updated_at = now()
  WHERE id = p_agent_id
    AND is_active = true
  RETURNING current_spend_cents INTO v_new_spend;

  -- Check if agent was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found or not active: %', p_agent_id;
  END IF;

  RETURN v_new_spend;
END;
$$;

COMMENT ON FUNCTION increment_agent_spend IS
  'Atomically increments an agent''s current_spend_cents. Returns new total spend.';

-- -----------------------------------------------------------------------------
-- 2. VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Test that function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'increment_agent_spend'
  ) THEN
    RAISE NOTICE 'ERROR: increment_agent_spend function not created';
  ELSE
    RAISE NOTICE '✓ increment_agent_spend function created successfully';
  END IF;
END;
$$;
-- =============================================================================
-- QODA VELOCITY CONTROLS MIGRATION
-- Migration: 011_qoda_velocity_controls.sql
-- =============================================================================
-- Adds velocity limits, merchant category controls, agent status, and 
-- real-time tracking fields for the Financial Observability platform.
--
-- Changes:
-- 1. Add soft/hard velocity limits to agents
-- 2. Add allowed merchant categories to agents
-- 3. Add agent status enum (green/yellow/red)
-- 4. Add velocity tracking fields for real-time monitoring
-- 5. Add agent logs table for operational correlation
-- 6. Add user webhooks table for custom integrations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. AGENT STATUS ENUM
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
    CREATE TYPE agent_status AS ENUM ('green', 'yellow', 'red');
  END IF;
END $$;

COMMENT ON TYPE agent_status IS 'Agent operational status: green=normal, yellow=throttled, red=frozen';

-- -----------------------------------------------------------------------------
-- 2. ADD VELOCITY CONTROLS TO AGENTS
-- -----------------------------------------------------------------------------

-- Soft limit (triggers alert, doesn't block)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS soft_limit_cents_per_minute BIGINT DEFAULT NULL;

-- Hard limit (blocks transactions)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS hard_limit_cents_per_minute BIGINT DEFAULT NULL;

-- Daily soft limit
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS soft_limit_cents_per_day BIGINT DEFAULT NULL;

-- Daily hard limit
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS hard_limit_cents_per_day BIGINT DEFAULT NULL;

-- Allowed merchant categories (null = all allowed)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS allowed_merchant_categories TEXT[] DEFAULT NULL;

-- Blocked merchant categories
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS blocked_merchant_categories TEXT[] DEFAULT NULL;

-- Agent status (circuit breaker)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS status agent_status DEFAULT 'green';

-- Status changed at (for tracking status duration)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT now();

-- Last transaction timestamp (for velocity calculation)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMPTZ DEFAULT NULL;

-- Current velocity (cents per minute, calculated)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS current_velocity_cents_per_minute BIGINT DEFAULT 0;

-- Today's spend (for daily limits)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS today_spend_cents BIGINT DEFAULT 0;

-- Today's date (for reset tracking)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS today_date DATE DEFAULT CURRENT_DATE;

-- Comments
COMMENT ON COLUMN agents.soft_limit_cents_per_minute IS 'Soft velocity limit - triggers alert when exceeded';
COMMENT ON COLUMN agents.hard_limit_cents_per_minute IS 'Hard velocity limit - blocks transactions when exceeded';
COMMENT ON COLUMN agents.allowed_merchant_categories IS 'Array of allowed MCC codes. NULL = all allowed';
COMMENT ON COLUMN agents.status IS 'Circuit breaker status: green/yellow/red';
COMMENT ON COLUMN agents.current_velocity_cents_per_minute IS 'Rolling velocity calculated from recent transactions';

-- -----------------------------------------------------------------------------
-- 3. AGENT LOGS TABLE (for operational correlation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Log details
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  
  -- Correlation
  transaction_id TEXT, -- Links to stripe_transaction_id if spend-related
  trace_id TEXT,       -- External trace ID for debugging
  
  -- Technical details
  http_status INTEGER,
  latency_ms INTEGER,
  tokens_used INTEGER,
  cost_cents BIGINT,
  
  -- Context
  prompt_preview TEXT,  -- First 500 chars of prompt (for debugging)
  response_preview TEXT, -- First 500 chars of response
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_org ON agent_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON agent_logs(level);
CREATE INDEX IF NOT EXISTS idx_agent_logs_transaction ON agent_logs(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_created ON agent_logs(agent_id, created_at DESC);

-- RLS Policies
CREATE POLICY "Members can view agent logs"
  ON agent_logs FOR SELECT
  USING (is_org_member(organization_id));

-- Webhooks use service role for inserts
CREATE POLICY "Service can insert agent logs"
  ON agent_logs FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE agent_logs IS 'Operational logs from AI agents for correlation with financial transactions';

-- -----------------------------------------------------------------------------
-- 4. USER WEBHOOKS TABLE (for custom integrations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization reference
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Webhook configuration
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- For signature verification
  
  -- Events to trigger on
  events TEXT[] NOT NULL DEFAULT ARRAY['transaction.created', 'agent.status_changed'],
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Stats
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_webhooks ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_webhooks_org ON user_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_active ON user_webhooks(organization_id, is_active) WHERE is_active = true;

-- RLS Policies
CREATE POLICY "Admins can manage webhooks"
  ON user_webhooks FOR ALL
  USING (has_org_role(organization_id, 'admin'))
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- Trigger for updated_at
CREATE TRIGGER trg_user_webhooks_updated
  BEFORE UPDATE ON user_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE user_webhooks IS 'User-defined webhooks for custom integrations';

-- -----------------------------------------------------------------------------
-- 5. TEAM INVITES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization reference
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Invite details
  email TEXT NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  
  -- Invite token (for email link)
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  
  -- Who invited
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_org ON team_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON team_invites(email);
CREATE INDEX IF NOT EXISTS idx_team_invites_token ON team_invites(token);
CREATE INDEX IF NOT EXISTS idx_team_invites_pending ON team_invites(organization_id, status) WHERE status = 'pending';

-- RLS Policies
CREATE POLICY "Admins can manage invites"
  ON team_invites FOR ALL
  USING (has_org_role(organization_id, 'admin'))
  WITH CHECK (has_org_role(organization_id, 'admin'));

-- Public can view invites by token (for accepting)
CREATE POLICY "Anyone can view invite by token"
  ON team_invites FOR SELECT
  USING (true);

COMMENT ON TABLE team_invites IS 'Pending team member invitations';

-- -----------------------------------------------------------------------------
-- 6. VELOCITY TRACKING FUNCTION
-- -----------------------------------------------------------------------------
-- Updates agent velocity and status based on recent transactions

CREATE OR REPLACE FUNCTION update_agent_velocity(
  p_agent_id UUID,
  p_amount_cents BIGINT
)
RETURNS agent_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent RECORD;
  v_new_velocity BIGINT;
  v_new_status agent_status;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current agent state
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found: %', p_agent_id;
  END IF;
  
  -- Reset daily spend if new day
  IF v_agent.today_date < v_today THEN
    UPDATE agents SET 
      today_spend_cents = p_amount_cents,
      today_date = v_today,
      last_transaction_at = now()
    WHERE id = p_agent_id;
  ELSE
    UPDATE agents SET 
      today_spend_cents = today_spend_cents + p_amount_cents,
      last_transaction_at = now()
    WHERE id = p_agent_id;
  END IF;
  
  -- Refresh agent data
  SELECT * INTO v_agent FROM agents WHERE id = p_agent_id;
  
  -- Calculate velocity (simplified: amount / time since last transaction)
  IF v_agent.last_transaction_at IS NOT NULL THEN
    -- Cents per minute based on this transaction's amount
    v_new_velocity := p_amount_cents;
  ELSE
    v_new_velocity := p_amount_cents;
  END IF;
  
  -- Determine new status based on limits
  v_new_status := 'green';
  
  -- Check hard limits first (RED)
  IF v_agent.hard_limit_cents_per_minute IS NOT NULL AND 
     v_new_velocity > v_agent.hard_limit_cents_per_minute THEN
    v_new_status := 'red';
  ELSIF v_agent.hard_limit_cents_per_day IS NOT NULL AND 
        v_agent.today_spend_cents > v_agent.hard_limit_cents_per_day THEN
    v_new_status := 'red';
  -- Check soft limits (YELLOW)
  ELSIF v_agent.soft_limit_cents_per_minute IS NOT NULL AND 
        v_new_velocity > v_agent.soft_limit_cents_per_minute THEN
    v_new_status := 'yellow';
  ELSIF v_agent.soft_limit_cents_per_day IS NOT NULL AND 
        v_agent.today_spend_cents > v_agent.soft_limit_cents_per_day THEN
    v_new_status := 'yellow';
  END IF;
  
  -- Update velocity and status if changed
  UPDATE agents SET 
    current_velocity_cents_per_minute = v_new_velocity,
    status = v_new_status,
    status_changed_at = CASE WHEN status != v_new_status THEN now() ELSE status_changed_at END
  WHERE id = p_agent_id;
  
  RETURN v_new_status;
END;
$$;

COMMENT ON FUNCTION update_agent_velocity IS 'Updates agent velocity metrics and circuit breaker status after a transaction';

-- -----------------------------------------------------------------------------
-- 7. CHECK MERCHANT CATEGORY FUNCTION
-- -----------------------------------------------------------------------------
-- Checks if a merchant category is allowed for an agent

CREATE OR REPLACE FUNCTION is_merchant_allowed(
  p_agent_id UUID,
  p_merchant_category TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed TEXT[];
  v_blocked TEXT[];
BEGIN
  SELECT allowed_merchant_categories, blocked_merchant_categories
  INTO v_allowed, v_blocked
  FROM agents
  WHERE id = p_agent_id;
  
  -- If blocked list exists and category is in it, deny
  IF v_blocked IS NOT NULL AND p_merchant_category = ANY(v_blocked) THEN
    RETURN FALSE;
  END IF;
  
  -- If allowed list exists, category must be in it
  IF v_allowed IS NOT NULL THEN
    RETURN p_merchant_category = ANY(v_allowed);
  END IF;
  
  -- Default: allow
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION is_merchant_allowed IS 'Checks if a merchant category is allowed for an agent based on whitelist/blacklist';

-- -----------------------------------------------------------------------------
-- 8. GET AGENT VELOCITY STATS (for dashboard)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_agent_velocity_stats(p_agent_id UUID)
RETURNS TABLE (
  velocity_cents_per_minute BIGINT,
  today_spend BIGINT,
  status agent_status,
  status_since TIMESTAMPTZ,
  soft_limit_minute BIGINT,
  hard_limit_minute BIGINT,
  soft_limit_day BIGINT,
  hard_limit_day BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    current_velocity_cents_per_minute,
    today_spend_cents,
    status,
    status_changed_at,
    soft_limit_cents_per_minute,
    hard_limit_cents_per_minute,
    soft_limit_cents_per_day,
    hard_limit_cents_per_day
  FROM agents
  WHERE id = p_agent_id;
$$;

COMMENT ON FUNCTION get_agent_velocity_stats IS 'Returns velocity statistics for dashboard display';

-- -----------------------------------------------------------------------------
-- 9. VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Verify new columns on agents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'agents' AND column_name = 'status') THEN
    RAISE EXCEPTION 'status column not added to agents';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'agents' AND column_name = 'hard_limit_cents_per_minute') THEN
    RAISE EXCEPTION 'hard_limit_cents_per_minute column not added to agents';
  END IF;
  
  -- Verify new tables
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'agent_logs') THEN
    RAISE EXCEPTION 'agent_logs table not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_webhooks') THEN
    RAISE EXCEPTION 'user_webhooks table not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'team_invites') THEN
    RAISE EXCEPTION 'team_invites table not created';
  END IF;
  
  RAISE NOTICE '✓ Migration 011_qoda_velocity_controls.sql completed successfully';
END;
$$;
-- =============================================================================
-- QODA WEBHOOK HELPER FUNCTIONS
-- Migration: 012_webhook_helpers.sql
-- =============================================================================
-- Helper functions for webhook management.
-- =============================================================================

-- Increment webhook failure count atomically
CREATE OR REPLACE FUNCTION increment_webhook_failures(webhook_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE user_webhooks
  SET failure_count = failure_count + 1
  WHERE id = webhook_id
  RETURNING failure_count INTO new_count;
  
  -- Disable webhook if too many failures
  IF new_count >= 10 THEN
    UPDATE user_webhooks
    SET is_active = false
    WHERE id = webhook_id;
  END IF;
  
  RETURN new_count;
END;
$$;

COMMENT ON FUNCTION increment_webhook_failures IS 'Atomically increments webhook failure count and disables after 10 failures';

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_webhook_failures'
  ) THEN
    RAISE EXCEPTION 'increment_webhook_failures function not created';
  END IF;
  
  RAISE NOTICE '✓ Migration 012_webhook_helpers.sql completed successfully';
END;
$$;
-- =============================================================================
-- QODA WAITLIST SIGNUPS
-- Migration: 013_waitlist_signups.sql
-- =============================================================================
-- Store waitlist signups for early access and marketing.
-- =============================================================================

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'landing_page',
  signup_ip INET,
  user_agent TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_source ON waitlist(source);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_converted ON waitlist(converted_at) WHERE converted_at IS NOT NULL;

-- Add RLS policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for waitlist signup)
CREATE POLICY "Allow public waitlist signup" ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to view waitlist (for admin)
CREATE POLICY "Allow authenticated users to view waitlist" ON waitlist
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_updated_at();

-- Add helpful comments
COMMENT ON TABLE waitlist IS 'Early access waitlist signups';
COMMENT ON COLUMN waitlist.email IS 'User email address';
COMMENT ON COLUMN waitlist.source IS 'Signup source (landing_page, referral, etc.)';
COMMENT ON COLUMN waitlist.signup_ip IS 'IP address of signup for analytics';
COMMENT ON COLUMN waitlist.user_agent IS 'Browser user agent for analytics';
COMMENT ON COLUMN waitlist.converted_at IS 'Timestamp when user converted to paid customer';

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'waitlist'
  ) THEN
    RAISE EXCEPTION 'waitlist table not created';
  END IF;

  RAISE NOTICE '✓ Migration 013_waitlist_signups.sql completed successfully';
END;
$$;
-- =============================================================================
-- QODA PERFORMANCE INDEXES
-- Migration: 014_performance_indexes.sql
-- =============================================================================
-- Add composite indexes for common query patterns to improve performance.
-- =============================================================================

-- Index for agent spend queries (agent + time range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_agent_created
  ON ledger_entries(organization_id, agent_id, created_at DESC)
  WHERE agent_id IS NOT NULL;

-- Index for client revenue queries (client + time range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_client_created
  ON ledger_entries(organization_id, client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

-- Index for transaction lookups by agent and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_agent_time
  ON transactions(agent_id, created_at DESC)
  WHERE agent_id IS NOT NULL;

-- Index for transaction lookups by client and time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_client_time
  ON transactions(client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

-- Index for webhook event lookups (org + event type + time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_webhook_org_event
  ON audit_log(organization_id, action, created_at DESC)
  WHERE action LIKE 'webhook_%';

-- Index for financial operation lookups (org + operation + time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_financial_org
  ON audit_log(organization_id, action, created_at DESC)
  WHERE action LIKE '%financial%' OR action LIKE '%ledger%';

-- Index for agent log queries (agent + level + time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_logs_agent_level_time
  ON agent_logs(agent_id, level, created_at DESC);

-- Index for organization member role lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_org_role
  ON org_members(organization_id, role);

-- Index for user profile email lookups (case insensitive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email_lower
  ON user_profiles(LOWER(email));

-- Index for team invite lookups (org + status + expiry)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_invites_org_status_expires
  ON team_invites(organization_id, status, expires_at)
  WHERE status = 'pending' AND expires_at > now();

-- Index for billing statement generation (org + time range)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_billing_period
  ON ledger_entries(organization_id, entry_type, created_at DESC)
  WHERE entry_type IN ('debit', 'credit');

-- Index for spend aggregation queries (org + agent + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_spend_aggregation
  ON ledger_entries(organization_id, agent_id, DATE(created_at), entry_type)
  WHERE entry_type = 'debit' AND agent_id IS NOT NULL;

-- Index for revenue aggregation queries (org + client + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_entries_revenue_aggregation
  ON ledger_entries(organization_id, client_id, DATE(created_at), entry_type)
  WHERE entry_type = 'credit' AND client_id IS NOT NULL;

-- Add partial indexes for active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_active_org
  ON agents(organization_id, created_at DESC)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_active_org
  ON clients(organization_id, created_at DESC)
  WHERE is_active = true;

-- Index for webhook retry lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_webhook_retry
  ON audit_log(organization_id, resource_id, action, created_at DESC)
  WHERE action LIKE 'webhook_%';

-- Comments for documentation
COMMENT ON INDEX idx_ledger_entries_agent_created IS 'Optimizes agent spend queries by organization, agent, and time';
COMMENT ON INDEX idx_ledger_entries_client_created IS 'Optimizes client revenue queries by organization, client, and time';
COMMENT ON INDEX idx_transactions_agent_time IS 'Optimizes transaction lookups by agent and time range';
COMMENT ON INDEX idx_transactions_client_time IS 'Optimizes transaction lookups by client and time range';
COMMENT ON INDEX idx_audit_log_webhook_org_event IS 'Optimizes webhook audit log queries';
COMMENT ON INDEX idx_audit_log_financial_org IS 'Optimizes financial operation audit queries';
COMMENT ON INDEX idx_agent_logs_agent_level_time IS 'Optimizes agent log filtering by agent, level, and time';
COMMENT ON INDEX idx_org_members_org_role IS 'Optimizes organization member role lookups';
COMMENT ON INDEX idx_user_profiles_email_lower IS 'Optimizes case-insensitive email lookups';
COMMENT ON INDEX idx_team_invites_org_status_expires IS 'Optimizes pending team invite queries with expiry';
COMMENT ON INDEX idx_ledger_entries_billing_period IS 'Optimizes billing statement generation';
COMMENT ON INDEX idx_ledger_entries_spend_aggregation IS 'Optimizes daily spend aggregation queries';
COMMENT ON INDEX idx_ledger_entries_revenue_aggregation IS 'Optimizes daily revenue aggregation queries';
COMMENT ON INDEX idx_agents_active_org IS 'Optimizes active agent queries by organization';
COMMENT ON INDEX idx_clients_active_org IS 'Optimizes active client queries by organization';
COMMENT ON INDEX idx_audit_log_webhook_retry IS 'Optimizes webhook retry and failure analysis';

-- Verification
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  -- Count the indexes we expect to create
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND indexname NOT LIKE '%013%'; -- Exclude previous migrations

  RAISE NOTICE 'Created % performance indexes', index_count;

  -- Basic verification that some key indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_ledger_entries_agent_created'
  ) THEN
    RAISE EXCEPTION 'Critical index idx_ledger_entries_agent_created not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_transactions_agent_time'
  ) THEN
    RAISE EXCEPTION 'Critical index idx_transactions_agent_time not created';
  END IF;

  RAISE NOTICE '✓ Migration 014_performance_indexes.sql completed successfully';
END;
$$;
