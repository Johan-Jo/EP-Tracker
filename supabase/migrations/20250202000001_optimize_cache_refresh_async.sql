-- Optimize cache refresh to be async/debounced
-- This prevents blocking INSERT operations

-- Create a queue table for async cache refresh
CREATE TABLE IF NOT EXISTS cache_refresh_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  org_id uuid NOT NULL,
  queued_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(user_id, org_id)
);

CREATE INDEX idx_cache_refresh_queue_unprocessed 
  ON cache_refresh_queue(queued_at) 
  WHERE processed_at IS NULL;

-- Optimized trigger function that queues refresh instead of doing it immediately
CREATE OR REPLACE FUNCTION trigger_refresh_dashboard_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Queue refresh instead of doing it immediately
  INSERT INTO cache_refresh_queue (user_id, org_id)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    COALESCE(NEW.org_id, OLD.org_id)
  )
  ON CONFLICT (user_id, org_id) 
  DO UPDATE SET queued_at = now(), processed_at = NULL;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION trigger_refresh_dashboard_cache IS 
  'EPIC 26.9: Queue cache refresh instead of doing it synchronously (prevents blocking INSERT)';

-- Function to process queued refreshes (can be called by background job)
CREATE OR REPLACE FUNCTION process_cache_refresh_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Process up to 10 queued refreshes at a time
  FOR v_record IN 
    SELECT DISTINCT user_id, org_id
    FROM cache_refresh_queue
    WHERE processed_at IS NULL
    ORDER BY queued_at
    LIMIT 10
  LOOP
    -- Refresh cache
    PERFORM refresh_dashboard_stats_cache(v_record.user_id, v_record.org_id);
    
    -- Mark as processed
    UPDATE cache_refresh_queue
    SET processed_at = now()
    WHERE user_id = v_record.user_id 
      AND org_id = v_record.org_id
      AND processed_at IS NULL;
  END LOOP;
  
  -- Clean up old processed entries (older than 1 hour)
  DELETE FROM cache_refresh_queue
  WHERE processed_at IS NOT NULL
    AND processed_at < now() - INTERVAL '1 hour';
END;
$$;

COMMENT ON FUNCTION process_cache_refresh_queue IS 
  'EPIC 26.9: Process queued cache refreshes (call this from background job every 5-10 seconds)';

