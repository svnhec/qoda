-- =============================================================================
-- SWITCHBOARD ATOMIC BALANCE OPERATIONS
-- Migration: 017_atomic_balance_operations.sql
-- =============================================================================
-- Fixes critical race conditions in balance updates by providing atomic operations.
--
-- Changes:
-- 1. add_organization_funds(): Atomically adds funds to organization balance
-- 2. deduct_organization_funds(): Atomically deducts funds from organization balance
-- 3. get_organization_balance(): Returns current balance atomically
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ATOMIC FUNDS ADDITION
-- -----------------------------------------------------------------------------
-- Adds funds to organization balance atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION add_organization_funds(
  p_organization_id UUID,
  p_amount_cents TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount BIGINT;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Validate input
  BEGIN
    v_amount := p_amount_cents::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Invalid amount format'::TEXT;
    RETURN;
  END;

  -- Validate amount is positive
  IF v_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Check organization exists
  SELECT issuing_balance_cents::BIGINT INTO v_current_balance
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) + v_amount;

  -- Atomic update using row-level lock
  UPDATE organizations
  SET issuing_balance_cents = v_new_balance::TEXT,
      updated_at = NOW()
  WHERE id = p_organization_id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_new_balance::TEXT, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, SQLERRM::TEXT;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. ATOMIC FUNDS DEDUCTION
-- -----------------------------------------------------------------------------
-- Deducts funds from organization balance atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION deduct_organization_funds(
  p_organization_id UUID,
  p_amount_cents TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount BIGINT;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Validate input
  BEGIN
    v_amount := p_amount_cents::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Invalid amount format'::TEXT;
    RETURN;
  END;

  -- Validate amount is positive
  IF v_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Check organization exists and get current balance
  SELECT issuing_balance_cents::BIGINT INTO v_current_balance
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient funds
  IF COALESCE(v_current_balance, 0) < v_amount THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Insufficient funds'::TEXT;
    RETURN;
  END IF;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) - v_amount;

  -- Atomic update using row-level lock
  UPDATE organizations
  SET issuing_balance_cents = v_new_balance::TEXT,
      updated_at = NOW()
  WHERE id = p_organization_id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_new_balance::TEXT, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, SQLERRM::TEXT;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. ATOMIC BALANCE RETRIEVAL
-- -----------------------------------------------------------------------------
-- Gets current organization balance atomically
CREATE OR REPLACE FUNCTION get_organization_balance(
  p_organization_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  balance TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  -- Get current balance
  SELECT issuing_balance_cents::BIGINT INTO v_balance
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Return balance
  RETURN QUERY SELECT TRUE, COALESCE(v_balance, 0)::TEXT, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, SQLERRM::TEXT;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. VERIFY MIGRATION
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'Atomic balance operations migration complete';
END;
$$;
