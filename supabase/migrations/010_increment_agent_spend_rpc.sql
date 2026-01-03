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


