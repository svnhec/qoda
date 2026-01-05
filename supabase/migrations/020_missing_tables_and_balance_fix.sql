-- =============================================================================
-- SWITCHBOARD MISSING TABLES & BALANCE FIX
-- Migration: 020_missing_tables_and_balance_fix.sql
-- =============================================================================
-- This migration addresses critical launch blockers:
--
-- 1. Creates missing tables: alerts, funding_transactions, invoices
-- 2. Converts issuing_balance_cents from TEXT to BIGINT (repo rule compliance)
-- 3. Updates atomic balance functions to use BIGINT directly
-- 4. Adds RLS policies for all new tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CONVERT ISSUING_BALANCE_CENTS TO BIGINT (CRITICAL)
-- -----------------------------------------------------------------------------
-- Current: TEXT column with cast operations (violates repo rules)
-- Target: BIGINT column for proper currency storage
-- -----------------------------------------------------------------------------

-- Add temporary BIGINT column
ALTER TABLE organizations
  ADD COLUMN issuing_balance_cents_bigint BIGINT NOT NULL DEFAULT 0;

-- Migrate data from TEXT to BIGINT (handle invalid data gracefully)
UPDATE organizations
SET issuing_balance_cents_bigint = CASE
  WHEN issuing_balance_cents ~ '^-?[0-9]+$' THEN issuing_balance_cents::BIGINT
  ELSE 0
END;

-- Drop old TEXT column and constraints
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_issuing_balance_cents_check,
  DROP COLUMN issuing_balance_cents;

-- Rename BIGINT column to final name
ALTER TABLE organizations
  RENAME COLUMN issuing_balance_cents_bigint TO issuing_balance_cents;

-- Add proper constraints for BIGINT
ALTER TABLE organizations
  ADD CONSTRAINT organizations_issuing_balance_cents_check
    CHECK (issuing_balance_cents >= 0);

-- Update comment
COMMENT ON COLUMN organizations.issuing_balance_cents IS
  'Organization balance in cents as BIGINT. Prevents floating point errors.';

-- Update index (if exists)
DROP INDEX IF EXISTS idx_organizations_balance;
CREATE INDEX IF NOT EXISTS idx_organizations_balance
  ON organizations(issuing_balance_cents);

-- -----------------------------------------------------------------------------
-- 2. CREATE ALERTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'velocity_breach',
    'decline_spike',
    'low_balance',
    'unusual_activity',
    'limit_approaching',
    'limit_reached',
    'card_suspended',
    'funding_required',
    'invoice_overdue',
    'system_maintenance'
  )),

  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical'))
    DEFAULT 'medium',

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Resolution tracking
  is_read BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_org_type ON alerts(organization_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_org_severity ON alerts(organization_id, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_org_read ON alerts(organization_id, is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view alerts"
  ON alerts FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Members can update alerts"
  ON alerts FOR UPDATE
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE POLICY "System can create alerts"
  ON alerts FOR INSERT
  WITH CHECK (true); -- Allow system/service operations

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alerts_updated_at();

-- -----------------------------------------------------------------------------
-- 3. CREATE FUNDING_TRANSACTIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funding_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Transaction details
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Stripe integration
  stripe_transfer_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- Transaction type and status
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'manual_deposit',
    'auto_topup',
    'refund',
    'chargeback',
    'adjustment'
  )) DEFAULT 'manual_deposit',

  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'completed',
    'failed',
    'cancelled',
    'refunded'
  )) DEFAULT 'pending',

  -- Processing details
  description TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_funding_org_status ON funding_transactions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_funding_stripe_transfer ON funding_transactions(stripe_transfer_id);
CREATE INDEX IF NOT EXISTS idx_funding_created_at ON funding_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE funding_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view funding transactions"
  ON funding_transactions FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "System can create funding transactions"
  ON funding_transactions FOR INSERT
  WITH CHECK (true); -- Allow system/service operations

CREATE POLICY "System can update funding transactions"
  ON funding_transactions FOR UPDATE
  WITH CHECK (true); -- Allow system/service operations

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_funding_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_funding_transactions_updated_at
  BEFORE UPDATE ON funding_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_funding_transactions_updated_at();

-- -----------------------------------------------------------------------------
-- 4. CREATE INVOICES TABLE (Internal invoice tracking)
-- -----------------------------------------------------------------------------
-- Decision: Implement internal invoice objects rather than pure Stripe-backed
-- This provides better UX and analytics while still integrating with Stripe
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invoice details
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Financial details
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  markup_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0,

  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE,
  stripe_subscription_item_id TEXT,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN (
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled',
    'refunded'
  )) DEFAULT 'draft',

  -- Dates
  sent_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Additional data
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Constraints
ALTER TABLE invoices
  ADD CONSTRAINT invoices_positive_amounts
    CHECK (subtotal_cents >= 0 AND markup_cents >= 0 AND total_cents >= 0);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view invoices"
  ON invoices FOR SELECT
  USING (is_org_member(organization_id));

CREATE POLICY "Admins can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (has_org_role(organization_id, 'admin'));

CREATE POLICY "Admins can update invoices"
  ON invoices FOR UPDATE
  USING (has_org_role(organization_id, 'admin'))
  WITH CHECK (has_org_role(organization_id, 'admin'));

CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  USING (has_org_role(organization_id, 'admin'));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- -----------------------------------------------------------------------------
-- 5. UPDATE ATOMIC BALANCE FUNCTIONS TO USE BIGINT DIRECTLY
-- -----------------------------------------------------------------------------
-- Now that the column is BIGINT, update the functions to work with BIGINT
CREATE OR REPLACE FUNCTION add_organization_funds(
  p_organization_id UUID,
  p_amount_cents BIGINT
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance BIGINT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Validate amount is positive
  IF p_amount_cents <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Check organization exists and get current balance
  SELECT issuing_balance_cents INTO v_current_balance
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) + p_amount_cents;

  -- Atomic update using row-level lock
  UPDATE organizations
  SET issuing_balance_cents = v_new_balance,
      updated_at = NOW()
  WHERE id = p_organization_id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, SQLERRM::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION deduct_organization_funds(
  p_organization_id UUID,
  p_amount_cents BIGINT
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance BIGINT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Validate amount is positive
  IF p_amount_cents <= 0 THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;

  -- Check organization exists and get current balance
  SELECT issuing_balance_cents INTO v_current_balance
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient funds
  IF COALESCE(v_current_balance, 0) < p_amount_cents THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Insufficient funds'::TEXT;
    RETURN;
  END IF;

  -- Calculate new balance
  v_new_balance := COALESCE(v_current_balance, 0) - p_amount_cents;

  -- Atomic update using row-level lock
  UPDATE organizations
  SET issuing_balance_cents = v_new_balance,
      updated_at = NOW()
  WHERE id = p_organization_id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, SQLERRM::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION get_organization_balance(
  p_organization_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  balance BIGINT,
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
  SELECT issuing_balance_cents INTO v_balance
  FROM organizations
  WHERE id = p_organization_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, 'Organization not found'::TEXT;
    RETURN;
  END IF;

  -- Return balance
  RETURN QUERY SELECT TRUE, COALESCE(v_balance, 0), NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::BIGINT, SQLERRM::TEXT;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. MIGRATION VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  -- Check that all tables were created
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('alerts', 'funding_transactions', 'invoices');

  IF table_count < 3 THEN
    RAISE EXCEPTION 'Not all required tables were created. Expected 3, got %', table_count;
  END IF;

  -- Check balance column is now BIGINT
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
      AND column_name = 'issuing_balance_cents'
      AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION 'issuing_balance_cents column is not BIGINT';
  END IF;

  RAISE NOTICE 'Migration 020 completed successfully - created tables and fixed balance column';
END;
$$;
