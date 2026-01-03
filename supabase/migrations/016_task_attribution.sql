-- =============================================================================
-- COST ATTRIBUTION BY TASK/WORKFLOW
-- Migration: 016_task_attribution.sql
-- =============================================================================
-- Adds fields to track what an AI agent was doing when it spent money.
-- This enables agencies to understand cost drivers and bill clients more
-- accurately based on specific workflows or tasks.
--
-- Key Features:
-- 1. task_context field on transaction_logs for workflow attribution
-- 2. task_catalog table for predefined task types
-- 3. Functions to aggregate spend by task
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND TRANSACTION_LOGS WITH TASK CONTEXT
-- -----------------------------------------------------------------------------

-- Primary task/workflow identifier
ALTER TABLE transaction_logs 
ADD COLUMN IF NOT EXISTS task_id TEXT DEFAULT NULL;

-- Human-readable task name
ALTER TABLE transaction_logs 
ADD COLUMN IF NOT EXISTS task_name TEXT DEFAULT NULL;

-- Task category for grouping
ALTER TABLE transaction_logs 
ADD COLUMN IF NOT EXISTS task_category TEXT DEFAULT NULL;

-- Additional context as structured JSON
ALTER TABLE transaction_logs 
ADD COLUMN IF NOT EXISTS task_context JSONB DEFAULT NULL;

-- Index for fast task-based queries
CREATE INDEX IF NOT EXISTS idx_transaction_logs_task 
  ON transaction_logs(task_id) WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_logs_task_category 
  ON transaction_logs(task_category) WHERE task_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_logs_task_client 
  ON transaction_logs(client_id, task_category) 
  WHERE task_category IS NOT NULL;

-- Comments
COMMENT ON COLUMN transaction_logs.task_id IS 'Unique identifier for the task/workflow that triggered this spend';
COMMENT ON COLUMN transaction_logs.task_name IS 'Human-readable name of the task (e.g., "Email Campaign - Q1")';
COMMENT ON COLUMN transaction_logs.task_category IS 'Category of task (e.g., "email_outreach", "data_enrichment", "research")';
COMMENT ON COLUMN transaction_logs.task_context IS 'Additional context about the task as JSON';

-- -----------------------------------------------------------------------------
-- 2. TASK CATALOG TABLE
-- -----------------------------------------------------------------------------
-- Predefined task types that agencies can use for consistent attribution

CREATE TABLE IF NOT EXISTS task_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization reference
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Task definition
  code TEXT NOT NULL,  -- e.g., "email_outreach"
  name TEXT NOT NULL,  -- e.g., "Email Outreach Campaigns"
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  
  -- Default billing markup for this task type (overrides org default)
  markup_basis_points INTEGER DEFAULT NULL,
  
  -- Icon/color for UI
  icon TEXT DEFAULT 'task',
  color TEXT DEFAULT '#6366f1',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Task code must be unique per org
  CONSTRAINT unique_task_code_per_org UNIQUE (organization_id, code)
);

-- Enable RLS
ALTER TABLE task_catalog ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_catalog_org ON task_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_catalog_code ON task_catalog(organization_id, code);
CREATE INDEX IF NOT EXISTS idx_task_catalog_category ON task_catalog(category);

-- RLS Policies
CREATE POLICY "task_catalog_select_policy" ON task_catalog FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "task_catalog_insert_policy" ON task_catalog FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "task_catalog_update_policy" ON task_catalog FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "task_catalog_delete_policy" ON task_catalog FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- Trigger for updated_at
CREATE TRIGGER trg_task_catalog_updated
  BEFORE UPDATE ON task_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT ALL ON task_catalog TO authenticated;

COMMENT ON TABLE task_catalog IS 'Predefined task types for consistent spend attribution';

-- -----------------------------------------------------------------------------
-- 3. AGGREGATE SPEND BY TASK FUNCTION
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_spend_by_task(
  p_organization_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id UUID DEFAULT NULL
)
RETURNS TABLE (
  task_category TEXT,
  task_count BIGINT,
  total_spend_cents BIGINT,
  transaction_count BIGINT,
  avg_spend_cents BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(task_category, 'unattributed') as task_category,
    COUNT(DISTINCT task_id) as task_count,
    COALESCE(SUM(amount_cents), 0) as total_spend_cents,
    COUNT(*) as transaction_count,
    COALESCE(AVG(amount_cents), 0)::BIGINT as avg_spend_cents
  FROM transaction_logs
  WHERE organization_id = p_organization_id
    AND status = 'approved'
    AND (p_start_date IS NULL OR DATE(created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(created_at) <= p_end_date)
    AND (p_client_id IS NULL OR client_id = p_client_id)
  GROUP BY task_category
  ORDER BY total_spend_cents DESC;
$$;

COMMENT ON FUNCTION get_spend_by_task IS 'Aggregates spend by task category for cost attribution analysis';

-- -----------------------------------------------------------------------------
-- 4. GET SPEND BY TASK FOR CLIENT (for rebilling)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_client_spend_by_task(
  p_client_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  task_category TEXT,
  task_name TEXT,
  total_spend_cents BIGINT,
  transaction_count BIGINT,
  first_transaction_at TIMESTAMPTZ,
  last_transaction_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(task_category, 'unattributed') as task_category,
    COALESCE(task_name, 'General') as task_name,
    SUM(amount_cents) as total_spend_cents,
    COUNT(*) as transaction_count,
    MIN(created_at) as first_transaction_at,
    MAX(created_at) as last_transaction_at
  FROM transaction_logs
  WHERE client_id = p_client_id
    AND status = 'approved'
    AND DATE(created_at) >= p_start_date
    AND DATE(created_at) <= p_end_date
  GROUP BY task_category, task_name
  ORDER BY total_spend_cents DESC;
$$;

COMMENT ON FUNCTION get_client_spend_by_task IS 'Get client spend breakdown by task for detailed invoices';

-- -----------------------------------------------------------------------------
-- 5. SEED COMMON TASK CATEGORIES
-- -----------------------------------------------------------------------------
-- These are common task types agencies might use

-- Note: This creates a template that gets copied when an org is created
-- We'll do this via the handle_new_org function or API

-- -----------------------------------------------------------------------------
-- 6. VERIFICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- Verify new columns on transaction_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transaction_logs' AND column_name = 'task_id') THEN
    RAISE EXCEPTION 'task_id column not added to transaction_logs';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transaction_logs' AND column_name = 'task_context') THEN
    RAISE EXCEPTION 'task_context column not added to transaction_logs';
  END IF;
  
  -- Verify task_catalog table
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'task_catalog') THEN
    RAISE EXCEPTION 'task_catalog table not created';
  END IF;
  
  RAISE NOTICE '✓ Migration 016_task_attribution.sql completed successfully';
END;
$$;

-- Final status
SELECT 
  'TASK ATTRIBUTION SCHEMA READY' AS status,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'transaction_logs' AND column_name LIKE 'task%') AS task_columns_added,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'task_catalog') AS task_catalog_policies;
