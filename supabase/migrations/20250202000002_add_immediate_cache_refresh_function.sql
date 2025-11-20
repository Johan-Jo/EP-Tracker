-- Add function to immediately refresh cache when needed (e.g., when user views dashboard)
-- This ensures fresh data when user actually needs it
CREATE OR REPLACE FUNCTION refresh_dashboard_stats_cache_immediate(
  p_user_id uuid,
  p_org_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh immediately
  PERFORM refresh_dashboard_stats_cache(p_user_id, p_org_id);
  
  -- Mark any queued refresh as processed
  UPDATE cache_refresh_queue
  SET processed_at = now()
  WHERE user_id = p_user_id 
    AND org_id = p_org_id
    AND processed_at IS NULL;
END;
$$;

COMMENT ON FUNCTION refresh_dashboard_stats_cache_immediate IS 
  'EPIC 26.9: Immediately refresh cache (use when user views dashboard, ensures fresh data)';

