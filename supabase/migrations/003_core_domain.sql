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






