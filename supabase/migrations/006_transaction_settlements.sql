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
