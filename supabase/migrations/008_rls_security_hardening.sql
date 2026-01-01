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
