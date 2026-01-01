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
