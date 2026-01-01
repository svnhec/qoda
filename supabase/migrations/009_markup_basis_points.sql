-- =============================================================================
-- SWITCHBOARD MARKUP BASIS POINTS
-- Migration: 009_markup_basis_points.sql
-- =============================================================================
-- Adds markup_basis_points column for BigInt-safe percentage calculations.
-- Replaces floating-point markup_percentage with basis points arithmetic.
--
-- Changes:
-- 1. Add markup_basis_points BIGINT column to organizations
-- 2. Backfill from existing markup_percentage values
-- 3. Update constraints and defaults
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD MARKUP_BASIS_POINTS COLUMN
-- -----------------------------------------------------------------------------
-- Store markup as basis points (1500 = 15%) for BigInt arithmetic

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS markup_basis_points BIGINT NOT NULL DEFAULT 1500
CHECK (markup_basis_points >= 0 AND markup_basis_points <= 10000);

COMMENT ON COLUMN organizations.markup_basis_points IS
  'Markup percentage as basis points (1500 = 15%). Used for BigInt-safe calculations.';

-- -----------------------------------------------------------------------------
-- 2. BACKFILL FROM EXISTING MARKUP_PERCENTAGE
-- -----------------------------------------------------------------------------
-- Convert existing percentage values to basis points
-- 15.0% → 1500 basis points, 12.5% → 1250 basis points, etc.

UPDATE organizations
SET markup_basis_points = ROUND(markup_percentage * 100)::BIGINT
WHERE markup_percentage IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. ADD INDEX FOR PERFORMANCE
-- -----------------------------------------------------------------------------
-- Index for potential queries on markup values

CREATE INDEX IF NOT EXISTS idx_organizations_markup_basis_points
  ON organizations(markup_basis_points);

-- -----------------------------------------------------------------------------
-- 4. VERIFICATION
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_count INTEGER;
  v_total_orgs INTEGER;
BEGIN
  -- Check column was added
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'organizations'
    AND column_name = 'markup_basis_points';

  IF v_count = 0 THEN
    RAISE NOTICE 'ERROR: markup_basis_points column not added';
  ELSE
    RAISE NOTICE '✓ markup_basis_points column added successfully';
  END IF;

  -- Check backfill worked
  SELECT COUNT(*) INTO v_total_orgs FROM organizations;
  SELECT COUNT(*) INTO v_count
  FROM organizations
  WHERE markup_basis_points IS NOT NULL;

  IF v_count = v_total_orgs THEN
    RAISE NOTICE '✓ All organizations have markup_basis_points values';
  ELSE
    RAISE NOTICE 'WARNING: %/% organizations have markup_basis_points', v_count, v_total_orgs;
  END IF;

  -- Show sample values
  RAISE NOTICE 'Sample markup conversions:';
  FOR r IN (
    SELECT name, markup_percentage, markup_basis_points,
           ROUND(markup_percentage * 100) as expected_basis_points
    FROM organizations
    LIMIT 5
  ) LOOP
    RAISE NOTICE '  %: %%% → % basis points (expected: %)',
      r.name, r.markup_percentage, r.markup_basis_points, r.expected_basis_points;
  END LOOP;
END;
$$;
