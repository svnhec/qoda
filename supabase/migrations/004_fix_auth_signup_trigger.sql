-- =============================================================================
-- FIX: AUTH SIGNUP TRIGGER FAILING ("Database error saving new user")
-- Migration: 004_fix_auth_signup_trigger.sql
-- =============================================================================
-- Problem:
-- - Supabase Auth signup can fail with a generic "Database error saving new user"
--   when the `handle_new_user()` trigger errors.
-- - Common causes:
--   1) `auth.uid()` is NULL in trigger context -> RLS insert policies reject inserts
--   2) `search_path` not set -> unqualified table references can fail or be unsafe
--
-- Fix:
-- - Harden `handle_new_user()` by setting `search_path` and schema-qualifying inserts
-- - Add safe exception logging to `audit_log` (no PII)
-- - Relax INSERT RLS checks to allow database roles (postgres/supabase_auth_admin)
--   used by triggers to insert during signup
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Update RLS policies to allow trigger-context inserts
-- -----------------------------------------------------------------------------

-- organizations: allow inserts from authenticated users OR internal DB roles
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR current_user IN ('postgres', 'supabase_auth_admin')
  );

-- user_profiles: allow inserts for self OR internal DB roles
DROP POLICY IF EXISTS "System creates user profiles" ON user_profiles;
CREATE POLICY "System creates user profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    OR current_user IN ('postgres', 'supabase_auth_admin')
  );

-- org_members: allow inserts from admins OR self OR internal DB roles
DROP POLICY IF EXISTS "Admins can invite members" ON org_members;
CREATE POLICY "Admins can invite members"
  ON org_members FOR INSERT
  WITH CHECK (
    has_org_role(organization_id, 'admin')
    OR user_id = auth.uid()
    OR current_user IN ('postgres', 'supabase_auth_admin')
  );

-- -----------------------------------------------------------------------------
-- 2) Harden the auth trigger function and add exception logging
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_org_name TEXT;
  v_org_slug TEXT;
  v_step TEXT := 'init';
BEGIN
  v_step := 'derive_org_fields';

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

  v_step := 'insert_organization';

  -- Create default organization for the user
  INSERT INTO public.organizations (name, slug, metadata)
  VALUES (v_org_name, v_org_slug, jsonb_build_object('created_by', NEW.id))
  RETURNING id INTO v_org_id;

  v_step := 'insert_user_profile';

  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    full_name,
    default_organization_id
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_org_id
  );

  v_step := 'insert_org_member_owner';

  -- Add user as owner of their organization
  INSERT INTO public.org_members (
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
EXCEPTION WHEN others THEN
  -- Best-effort logging (no PII). Do not block exception if logging fails.
  BEGIN
    INSERT INTO public.audit_log (
      action,
      resource_type,
      resource_id,
      error_message,
      metadata
    ) VALUES (
      'auth_signup_trigger_error',
      'auth_user',
      NEW.id::text,
      SQLERRM,
      jsonb_build_object(
        'sqlstate', SQLSTATE,
        'step', v_step,
        'current_user', current_user,
        'search_path', current_setting('search_path', true)
      )
    );
  EXCEPTION WHEN others THEN
    -- swallow
  END;
  RAISE;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Auto-creates user_profile and default organization on signup. Hardened with search_path and audit logging.';





