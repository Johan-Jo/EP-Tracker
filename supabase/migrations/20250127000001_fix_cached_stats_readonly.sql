-- Fix: Change get_dashboard_stats_cached from STABLE to VOLATILE
-- Because it calls refresh_dashboard_stats_cache which does DELETE/INSERT

CREATE OR REPLACE FUNCTION get_dashboard_stats_cached(
  p_user_id uuid,
  p_org_id uuid,
  p_start_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE  -- Changed from STABLE to VOLATILE
AS $$
DECLARE
  result json;
  cache_age_minutes int;
BEGIN
  -- Check cache age
  SELECT EXTRACT(EPOCH FROM (NOW() - last_refreshed_at)) / 60
  INTO cache_age_minutes
  FROM dashboard_stats_cache
  WHERE user_id = p_user_id AND org_id = p_org_id;
  
  -- If cache is older than 5 minutes, refresh it
  IF cache_age_minutes IS NULL OR cache_age_minutes > 5 THEN
    PERFORM refresh_dashboard_stats_cache(p_user_id, p_org_id);
  END IF;
  
  -- Return cached stats
  SELECT json_build_object(
    'active_projects', active_projects_count,
    'total_hours_week', total_hours_week,
    'total_materials_week', materials_week_count,
    'total_time_entries_week', time_entries_week_count,
    'cache_age_seconds', EXTRACT(EPOCH FROM (NOW() - last_refreshed_at))
  )
  INTO result
  FROM dashboard_stats_cache
  WHERE user_id = p_user_id AND org_id = p_org_id;
  
  -- If no cache exists, return defaults
  IF result IS NULL THEN
    result := json_build_object(
      'active_projects', 0,
      'total_hours_week', 0,
      'total_materials_week', 0,
      'total_time_entries_week', 0,
      'cache_age_seconds', 0
    );
  END IF;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_stats_cached IS 
  'EPIC 26.9: Get dashboard stats from cache (5-10ms instead of 500ms) - FIXED: Changed to VOLATILE';

