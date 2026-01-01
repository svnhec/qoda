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




