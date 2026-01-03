-- =============================================================================
-- QODA WEBHOOK HELPER FUNCTIONS
-- Migration: 012_webhook_helpers.sql
-- =============================================================================
-- Helper functions for webhook management.
-- =============================================================================

-- Increment webhook failure count atomically
CREATE OR REPLACE FUNCTION increment_webhook_failures(webhook_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE user_webhooks
  SET failure_count = failure_count + 1
  WHERE id = webhook_id
  RETURNING failure_count INTO new_count;
  
  -- Disable webhook if too many failures
  IF new_count >= 10 THEN
    UPDATE user_webhooks
    SET is_active = false
    WHERE id = webhook_id;
  END IF;
  
  RETURN new_count;
END;
$$;

COMMENT ON FUNCTION increment_webhook_failures IS 'Atomically increments webhook failure count and disables after 10 failures';

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_webhook_failures'
  ) THEN
    RAISE EXCEPTION 'increment_webhook_failures function not created';
  END IF;
  
  RAISE NOTICE '✓ Migration 012_webhook_helpers.sql completed successfully';
END;
$$;
