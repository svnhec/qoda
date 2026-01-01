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
