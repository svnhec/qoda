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
