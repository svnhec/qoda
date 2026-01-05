-- =============================================================================
-- SWITCHBOARD ORGANIZATIONS & MULTI-TENANCY
-- Migration: 002_organizations.sql
-- =============================================================================
-- Extends the organizations table from 001_ledger_schema.sql
-- Adds user profiles, membership, and RLS for multi-tenancy
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND ORGANIZATIONS TABLE
-- -----------------------------------------------------------------------------
-- Add Stripe Connect and billing fields to the existing organizations table

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_account_requirements_due JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_account_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Add constraint for markup percentage (0-100%)
ALTER TABLE organizations
  ADD CONSTRAINT chk_markup_percentage 
  CHECK (markup_percentage >= 0 AND markup_percentage <= 1);

-- Add unique constraint on stripe_account_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizations_stripe_account_id_key'
  ) THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_stripe_account_id_key 
      UNIQUE (stripe_account_id);
  END IF;
END;
$$;

-- Index for Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account 
  ON organizations(stripe_account_id) 
  WHERE stripe_account_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN organizations.markup_percentage IS 
  'Default markup percentage for rebilling (0.15 = 15%). Range: 0.0000 to 1.0000';
COMMENT ON COLUMN organizations.stripe_account_requirements_due IS 
  'Requirements needed to complete Stripe Connect onboarding';

-- -----------------------------------------------------------------------------
-- 2. ROLE TYPE
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. USER PROFILES TABLE
-- -----------------------------------------------------------------------------
-- Extends auth.users with application-specific data
-- Linked 1:1 with auth.users

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Display info
  full_name TEXT,
  avatar_url TEXT,
  
  -- Default organization (user can belong to multiple orgs)
  default_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Preferences
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": false,
    "slack": false
  }'::jsonb,
  
  -- Flexible metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_default_org 
  ON user_profiles(default_organization_id);

-- Comment
COMMENT ON TABLE user_profiles IS 
  'Application-specific user data. 1:1 with auth.users. Created automatically on signup.';

-- -----------------------------------------------------------------------------
-- 4. ORGANIZATION MEMBERS TABLE
-- -----------------------------------------------------------------------------
-- Many-to-many between users and organizations with roles

CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role in this organization
  role org_role NOT NULL DEFAULT 'member',
  
  -- Invitation flow
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ, -- NULL = pending invitation
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each user can only be a member of an org once
  CONSTRAINT unique_org_membership UNIQUE (organization_id, user_id)
);

-- Enable RLS
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_pending ON org_members(organization_id) 
  WHERE accepted_at IS NULL;

-- Comment
COMMENT ON TABLE org_members IS 
  'Organization membership with roles. accepted_at NULL = pending invitation.';

-- -----------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS FOR RLS
-- -----------------------------------------------------------------------------

-- Check if current user is a member of the specified organization
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND accepted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_org_member IS 
  'Returns TRUE if auth.uid() is an accepted member of the organization.';

-- Check if current user has a specific role (or higher) in the organization
CREATE OR REPLACE FUNCTION has_org_role(p_org_id UUID, p_min_role org_role)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role org_role;
BEGIN
  SELECT role INTO v_user_role
  FROM org_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
  
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Role hierarchy: owner > admin > member > viewer
  CASE p_min_role
    WHEN 'owner' THEN
      RETURN v_user_role = 'owner';
    WHEN 'admin' THEN
      RETURN v_user_role IN ('owner', 'admin');
    WHEN 'member' THEN
      RETURN v_user_role IN ('owner', 'admin', 'member');
    WHEN 'viewer' THEN
      RETURN TRUE; -- Any accepted member can view
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_org_role IS 
  'Returns TRUE if auth.uid() has the specified role or higher in the organization.';

-- Get all organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id 
  FROM org_members
  WHERE user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_org_ids IS 
  'Returns all organization IDs the current user is an accepted member of.';

-- Get current user's role in an organization
CREATE OR REPLACE FUNCTION get_org_role(p_org_id UUID)
RETURNS org_role AS $$
  SELECT role 
  FROM org_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND accepted_at IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_org_role IS 
  'Returns the current user''s role in the specified organization, or NULL if not a member.';

-- -----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Drop existing policies if they exist (from 001_ledger_schema.sql)
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- ORGANIZATIONS POLICIES
-- Select: Members can view their organizations
CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (is_org_member(id) OR NOT is_active);

-- Insert: Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update: Only owners and admins can update
CREATE POLICY "Owners and admins can update organizations"
  ON organizations FOR UPDATE
  USING (has_org_role(id, 'admin'))
  WITH CHECK (has_org_role(id, 'admin'));

-- Delete: Only owners can delete (soft delete preferred)
CREATE POLICY "Owners can delete organizations"
  ON organizations FOR DELETE
  USING (has_org_role(id, 'owner'));

-- USER PROFILES POLICIES
-- Select: Users can view their own profile, org members can view each other
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (
    id = auth.uid() 
    OR id IN (
      SELECT user_id FROM org_members 
      WHERE organization_id IN (SELECT get_user_org_ids())
        AND accepted_at IS NOT NULL
    )
  );

-- Insert: Only system can create (via trigger)
CREATE POLICY "System creates user profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Update: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ORG MEMBERS POLICIES
-- Select: Members can see other members in their orgs
CREATE POLICY "Members can view org membership"
  ON org_members FOR SELECT
  USING (
    is_org_member(organization_id)
    OR user_id = auth.uid()  -- Can see own pending invitations
  );

-- Insert: Admins can invite new members
CREATE POLICY "Admins can invite members"
  ON org_members FOR INSERT
  WITH CHECK (
    has_org_role(organization_id, 'admin')
    OR (
      -- Allow self-insert when accepting invitation or creating org
      user_id = auth.uid()
    )
  );

-- Update: Admins can update roles, users can accept invitations
CREATE POLICY "Admins can update membership"
  ON org_members FOR UPDATE
  USING (
    has_org_role(organization_id, 'admin')
    OR (user_id = auth.uid() AND accepted_at IS NULL)  -- Accept own invitation
  )
  WITH CHECK (
    has_org_role(organization_id, 'admin')
    OR (user_id = auth.uid() AND accepted_at IS NULL)
  );

-- Delete: Admins can remove members, users can leave
CREATE POLICY "Admins can remove members"
  ON org_members FOR DELETE
  USING (
    has_org_role(organization_id, 'admin')
    OR user_id = auth.uid()  -- Users can leave
  );

-- -----------------------------------------------------------------------------
-- 7. AUTO-CREATE USER PROFILE AND DEFAULT ORG ON SIGNUP
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_org_slug TEXT;
BEGIN
  -- Generate organization name from email or metadata
  v_org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  ) || '''s Agency';
  
  -- Generate unique slug
  v_org_slug := lower(regexp_replace(
    COALESCE(
      NEW.raw_user_meta_data->>'organization_slug',
      split_part(NEW.email, '@', 1)
    ),
    '[^a-z0-9]+', '-', 'g'
  )) || '-' || substr(NEW.id::text, 1, 8);
  
  -- Create default organization for the user
  INSERT INTO organizations (name, slug, metadata)
  VALUES (v_org_name, v_org_slug, jsonb_build_object('created_by', NEW.id))
  RETURNING id INTO v_org_id;
  
  -- Create user profile
  INSERT INTO user_profiles (
    id,
    full_name,
    default_organization_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_org_id
  );
  
  -- Add user as owner of their organization
  INSERT INTO org_members (
    organization_id,
    user_id,
    role,
    invited_by,
    accepted_at
  ) VALUES (
    v_org_id,
    NEW.id,
    'owner',
    NEW.id,  -- Self-invited
    now()    -- Auto-accepted
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

COMMENT ON FUNCTION handle_new_user IS 
  'Automatically creates user_profile and default organization when a user signs up.';

-- -----------------------------------------------------------------------------
-- 8. UPDATE TIMESTAMP TRIGGERS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_org_members_updated
  BEFORE UPDATE ON org_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- 9. UPDATE CHART_OF_ACCOUNTS RLS
-- -----------------------------------------------------------------------------
-- Now that we have proper org membership, update the policies

DROP POLICY IF EXISTS "Users can view their org accounts and system accounts" ON chart_of_accounts;
DROP POLICY IF EXISTS "Only admins can modify system accounts" ON chart_of_accounts;

-- Select: Members can view their org's accounts + system accounts
CREATE POLICY "Members can view accounts"
  ON chart_of_accounts FOR SELECT
  USING (
    organization_id IS NULL  -- System accounts visible to all authenticated
    OR is_org_member(organization_id)
  );

-- Insert: Admins can create org-specific accounts
CREATE POLICY "Admins can create accounts"
  ON chart_of_accounts FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL  -- Can't create system accounts
    AND has_org_role(organization_id, 'admin')
  );

-- Update: Admins can update org-specific accounts
CREATE POLICY "Admins can update accounts"
  ON chart_of_accounts FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND has_org_role(organization_id, 'admin')
  );

-- -----------------------------------------------------------------------------
-- 10. UPDATE JOURNAL_ENTRIES RLS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view journal entries for their accounts" ON journal_entries;
DROP POLICY IF EXISTS "Users can insert journal entries for their accounts" ON journal_entries;

-- Select: Members can view entries for accounts they have access to
CREATE POLICY "Members can view journal entries"
  ON journal_entries FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM chart_of_accounts
      WHERE organization_id IS NULL  -- System accounts
         OR is_org_member(organization_id)
    )
  );

-- Insert: Members can create entries for their org's accounts
CREATE POLICY "Members can create journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM chart_of_accounts
      WHERE organization_id IS NULL  -- System accounts (for platform operations)
         OR has_org_role(organization_id, 'member')
    )
  );

-- -----------------------------------------------------------------------------
-- 11. UPDATE AUDIT_LOG RLS
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their organization audit logs" ON audit_log;
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_log;

-- Select: Members can view their org's audit logs
CREATE POLICY "Members can view audit logs"
  ON audit_log FOR SELECT
  USING (
    organization_id IS NULL  -- System logs (for admins)
    OR is_org_member(organization_id)
  );

-- Insert: Allow inserting audit logs (no restrictions - logging should never fail)
CREATE POLICY "Allow audit log inserts"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 12. HELPER VIEWS
-- -----------------------------------------------------------------------------

-- View for getting organization details with member count
CREATE OR REPLACE VIEW organization_summary AS
SELECT 
  o.id,
  o.name,
  o.slug,
  o.stripe_account_id,
  o.stripe_account_verified_at IS NOT NULL AS is_stripe_verified,
  o.markup_percentage,
  o.is_active,
  o.created_at,
  (SELECT COUNT(*) FROM org_members om WHERE om.organization_id = o.id AND om.accepted_at IS NOT NULL) AS member_count,
  (SELECT COUNT(*) FROM org_members om WHERE om.organization_id = o.id AND om.accepted_at IS NULL) AS pending_invites
FROM organizations o;

COMMENT ON VIEW organization_summary IS 
  'Organizations with computed member counts. Respects RLS.';

-- -----------------------------------------------------------------------------
-- 13. VERIFICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  -- Verify tables exist
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles'), 
    'user_profiles table not created';
  ASSERT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'org_members'), 
    'org_members table not created';
  
  -- Verify columns were added to organizations
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'markup_percentage'
  ), 'markup_percentage column not added to organizations';
  
  -- Verify RLS is enabled
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_profiles'), 
    'RLS not enabled on user_profiles';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'org_members'), 
    'RLS not enabled on org_members';
  
  RAISE NOTICE 'Migration 002_organizations.sql verification passed!';
END;
$$;

-- Final status
SELECT 
  'ORGANIZATIONS SCHEMA INITIALIZED' AS status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'organizations') AS org_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles') AS profile_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'org_members') AS member_policies;









