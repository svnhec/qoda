-- =============================================================================
-- SWITCHBOARD FIX BALANCE COLUMN
-- Migration: 018_fix_balance_column.sql
-- =============================================================================
-- CRITICAL: Add missing issuing_balance_cents column to organizations table
-- This was referenced by balance functions but never created.
-- =============================================================================

-- Add the missing column with proper constraints
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS issuing_balance_cents TEXT NOT NULL DEFAULT '0'
  CHECK (issuing_balance_cents ~ '^-?[0-9]+$'); -- Ensure valid integer string

-- Add comment for clarity
COMMENT ON COLUMN organizations.issuing_balance_cents IS
  'Organization balance in cents as TEXT. Prevents floating point errors.';

-- Add index for performance on balance queries
CREATE INDEX IF NOT EXISTS idx_organizations_balance
  ON organizations(issuing_balance_cents);

-- Verify the column exists and has proper structure
DO $$
BEGIN
  -- Check column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
      AND column_name = 'issuing_balance_cents'
  ) THEN
    RAISE EXCEPTION 'issuing_balance_cents column was not created successfully';
  END IF;

  -- Check constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE '%issuing_balance_cents%'
      AND contype = 'c'
  ) THEN
    RAISE EXCEPTION 'issuing_balance_cents check constraint was not created';
  END IF;

  RAISE NOTICE 'Balance column fix applied successfully';
END;
$$;
