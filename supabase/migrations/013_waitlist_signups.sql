-- =============================================================================
-- QODA WAITLIST SIGNUPS
-- Migration: 013_waitlist_signups.sql
-- =============================================================================
-- Store waitlist signups for early access and marketing.
-- =============================================================================

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'landing_page',
  signup_ip INET,
  user_agent TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_source ON waitlist(source);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_converted ON waitlist(converted_at) WHERE converted_at IS NOT NULL;

-- Add RLS policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for waitlist signup)
CREATE POLICY "Allow public waitlist signup" ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to view waitlist (for admin)
CREATE POLICY "Allow authenticated users to view waitlist" ON waitlist
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_updated_at();

-- Add helpful comments
COMMENT ON TABLE waitlist IS 'Early access waitlist signups';
COMMENT ON COLUMN waitlist.email IS 'User email address';
COMMENT ON COLUMN waitlist.source IS 'Signup source (landing_page, referral, etc.)';
COMMENT ON COLUMN waitlist.signup_ip IS 'IP address of signup for analytics';
COMMENT ON COLUMN waitlist.user_agent IS 'Browser user agent for analytics';
COMMENT ON COLUMN waitlist.converted_at IS 'Timestamp when user converted to paid customer';

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'waitlist'
  ) THEN
    RAISE EXCEPTION 'waitlist table not created';
  END IF;

  RAISE NOTICE '✓ Migration 013_waitlist_signups.sql completed successfully';
END;
$$;



