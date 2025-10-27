-- Add RLS policies for dashboard_stats_cache materialized view
-- Even with SECURITY DEFINER, the view needs RLS policies

-- Enable RLS on the materialized view
ALTER MATERIALIZED VIEW dashboard_stats_cache OWNER TO postgres;

-- Grant permissions to authenticated users
GRANT SELECT ON dashboard_stats_cache TO authenticated;
GRANT SELECT ON dashboard_stats_cache TO service_role;

-- Note: Materialized views don't support RLS policies directly,
-- but the SECURITY DEFINER function can access it with these grants

