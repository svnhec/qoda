-- =============================================================================
-- QODA PERFORMANCE INDEXES (FIXED)
-- Migration: 014_performance_indexes.sql
-- =============================================================================
-- Add composite indexes for common query patterns to improve performance.
-- NOTE: Only includes indexes for tables that actually exist.
-- =============================================================================

-- Index for organization member role lookups
CREATE INDEX IF NOT EXISTS idx_org_members_org_role
  ON org_members(organization_id, role);

-- Add partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_agents_active_org
  ON agents(organization_id, created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_clients_active_org
  ON clients(organization_id, created_at DESC)
  WHERE is_active = true;

-- Index for virtual cards by agent
CREATE INDEX IF NOT EXISTS idx_virtual_cards_agent
  ON virtual_cards(agent_id, created_at DESC)
  WHERE is_active = true;

-- Index for transaction settlements by agent and time
CREATE INDEX IF NOT EXISTS idx_transaction_settlements_agent_time
  ON transaction_settlements(agent_id, created_at DESC);

-- Index for transaction settlements by organization
CREATE INDEX IF NOT EXISTS idx_transaction_settlements_org
  ON transaction_settlements(organization_id, created_at DESC);

-- Index for journal entries by account (accounts link to organizations)
-- Note: journal_entries don't have direct organization_id column
-- They are linked via account_id -> chart_of_accounts.organization_id

-- Index for audit log actions
CREATE INDEX IF NOT EXISTS idx_audit_log_org_action
  ON audit_log(organization_id, action, created_at DESC);

-- Comments for documentation
COMMENT ON INDEX idx_org_members_org_role IS 'Optimizes organization member role lookups';
COMMENT ON INDEX idx_agents_active_org IS 'Optimizes active agent queries by organization';
COMMENT ON INDEX idx_clients_active_org IS 'Optimizes active client queries by organization';

-- Verification
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';

  RAISE NOTICE '✓ Created % performance indexes', index_count;
  RAISE NOTICE '✓ Migration 014_performance_indexes.sql completed successfully';
END;
$$;
