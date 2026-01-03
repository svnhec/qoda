-- =============================================================================
-- FIX SERVICE ROLE AND AUTHENTICATED PERMISSIONS
-- Critical Fix: Grant access to tables created after schema initialization
-- =============================================================================

-- 1. Grant full access to existing tables for the Service Role (Admin)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 2. Ensure Service Role inherits permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- 3. Grant specific access for Authenticated Users (essential for RLS to work)
-- Even with RLS policies, the role needs basic table permissions
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON org_members TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON clients TO authenticated;          -- ← CRITICAL: Was missing!
GRANT ALL ON agents TO authenticated;
GRANT ALL ON virtual_cards TO authenticated;
GRANT ALL ON transaction_logs TO authenticated;
GRANT ALL ON authorizations_log TO authenticated;

-- 4. Grant access to sequences for Authenticated Users (for IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- 5. FIX RLS POLICIES ON CLIENTS TABLE
-- =============================================================================
-- Drop existing broken policies and create simpler ones

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view clients" ON clients;
DROP POLICY IF EXISTS "Admins can create clients" ON clients;
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

-- Recreate with simpler logic (using org_members directly instead of functions)

-- SELECT: Any org member can view clients in their org
CREATE POLICY "clients_select_policy" ON clients FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- INSERT: Any org member can create clients (simplifying from admin-only for now)
CREATE POLICY "clients_insert_policy" ON clients FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- UPDATE: Any org member can update clients in their org
CREATE POLICY "clients_update_policy" ON clients FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- DELETE: Any org member can delete clients in their org
CREATE POLICY "clients_delete_policy" ON clients FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- =============================================================================
-- 6. FIX RLS POLICIES ON AGENTS TABLE (same pattern)
-- =============================================================================

DROP POLICY IF EXISTS "Members can view agents" ON agents;
DROP POLICY IF EXISTS "Members can create agents" ON agents;
DROP POLICY IF EXISTS "Members can update agents" ON agents;
DROP POLICY IF EXISTS "Admins can delete agents" ON agents;

CREATE POLICY "agents_select_policy" ON agents FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "agents_insert_policy" ON agents FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "agents_update_policy" ON agents FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

CREATE POLICY "agents_delete_policy" ON agents FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM org_members 
    WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
  )
);

-- =============================================================================
-- 7. Verification
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Permissions and RLS policies fixed!';
END $$;

SELECT 
  'RLS POLICIES FIXED' AS status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'clients') AS clients_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'agents') AS agents_policies;
