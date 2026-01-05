-- =============================================================================
-- SWITCHBOARD RLS SECURITY FIX
-- Migration: 019_fix_rls_security.sql
-- =============================================================================
-- Fixes critical RLS security issues identified in audit:
-- 1. transaction_logs allows unrestricted INSERTs (should be service-only)
-- 2. Add missing indexes for performance
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX TRANSACTION LOGS RLS (SECURITY CRITICAL)
-- -----------------------------------------------------------------------------
-- Remove the permissive INSERT policy that allows any authenticated user to create transaction logs
-- Transaction logs should only be created by service role (webhooks/background jobs)

DROP POLICY IF EXISTS "Members can view transaction logs" ON transaction_logs;
DROP POLICY IF EXISTS "System can insert transaction logs" ON transaction_logs;
DROP POLICY IF EXISTS "System can update transaction logs" ON transaction_logs;

-- Only allow viewing transaction logs for org members
CREATE POLICY "Members can view transaction logs"
  ON transaction_logs FOR SELECT
  USING (is_org_member(organization_id));

-- No INSERT/UPDATE policies for transaction_logs - only service role can modify

-- -----------------------------------------------------------------------------
-- 2. FIX AUTHORIZATIONS LOG RLS
-- -----------------------------------------------------------------------------
-- Same issue as transaction_logs - remove permissive policies

DROP POLICY IF EXISTS "Members can view authorizations log" ON authorizations_log;
DROP POLICY IF EXISTS "System can insert authorizations log" ON authorizations_log;

-- Only allow viewing authorizations for org members (through card ownership)
CREATE POLICY "Members can view authorizations log"
  ON authorizations_log FOR SELECT
  USING (
    card_id IN (
      SELECT id FROM virtual_cards
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- No INSERT policies for authorizations_log - only service role

-- -----------------------------------------------------------------------------
-- 3. ADD MISSING PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
-- Add indexes that were identified as missing in the audit

-- Organizations: created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_organizations_created_at
  ON organizations(created_at DESC);

-- Agents: created_at and active status for dashboard queries
CREATE INDEX IF NOT EXISTS idx_agents_created_at
  ON agents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_active_created
  ON agents(is_active, created_at DESC) WHERE is_active = true;

-- Clients: created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_clients_created_at
  ON clients(created_at DESC);

-- Virtual cards: created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_virtual_cards_created_at
  ON virtual_cards(created_at DESC);

-- Transaction logs: organization + created_at for org-specific history
CREATE INDEX IF NOT EXISTS idx_transaction_logs_org_created
  ON transaction_logs(organization_id, created_at DESC);

-- Authorizations log: created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_authorizations_log_created_at
  ON authorizations_log(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. VERIFY SECURITY FIXES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_transaction_insert_policies INTEGER;
  v_authorization_insert_policies INTEGER;
  v_transaction_select_policies INTEGER;
  v_authorization_select_policies INTEGER;
BEGIN
  -- Check transaction_logs policies
  SELECT COUNT(*) INTO v_transaction_insert_policies
  FROM pg_policies
  WHERE tablename = 'transaction_logs' AND cmd = 'INSERT';

  SELECT COUNT(*) INTO v_transaction_select_policies
  FROM pg_policies
  WHERE tablename = 'transaction_logs' AND cmd = 'SELECT';

  -- Check authorizations_log policies
  SELECT COUNT(*) INTO v_authorization_insert_policies
  FROM pg_policies
  WHERE tablename = 'authorizations_log' AND cmd = 'INSERT';

  SELECT COUNT(*) INTO v_authorization_select_policies
  FROM pg_policies
  WHERE tablename = 'authorizations_log' AND cmd = 'SELECT';

  -- Verify fixes
  IF v_transaction_insert_policies > 0 THEN
    RAISE EXCEPTION 'SECURITY ISSUE: transaction_logs still has INSERT policies after migration';
  END IF;

  IF v_authorization_insert_policies > 0 THEN
    RAISE EXCEPTION 'SECURITY ISSUE: authorizations_log still has INSERT policies after migration';
  END IF;

  IF v_transaction_select_policies = 0 THEN
    RAISE EXCEPTION 'ERROR: transaction_logs has no SELECT policies after migration';
  END IF;

  IF v_authorization_select_policies = 0 THEN
    RAISE EXCEPTION 'ERROR: authorizations_log has no SELECT policies after migration';
  END IF;

  RAISE NOTICE '✓ RLS Security fixes applied successfully';
  RAISE NOTICE '✓ transaction_logs: % SELECT policies, % INSERT policies', v_transaction_select_policies, v_transaction_insert_policies;
  RAISE NOTICE '✓ authorizations_log: % SELECT policies, % INSERT policies', v_authorization_select_policies, v_authorization_insert_policies;
END;
$$;
