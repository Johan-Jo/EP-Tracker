-- Fix: refresh_dashboard_stats_cache cannot DELETE from materialized view
-- Solution: Use a regular table instead of materialized view for user-specific caching

-- Drop the old materialized view approach
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats_cache CASCADE;

-- Create a regular table for caching (allows DELETE/INSERT)
CREATE TABLE IF NOT EXISTS dashboard_stats_cache (
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  active_projects_count int DEFAULT 0,
  total_projects_count int DEFAULT 0,
  time_entries_week_count int DEFAULT 0,
  total_hours_week numeric DEFAULT 0,
  time_entries_month_count int DEFAULT 0,
  total_hours_month numeric DEFAULT 0,
  materials_week_count int DEFAULT 0,
  materials_month_count int DEFAULT 0,
  expenses_week_count int DEFAULT 0,
  expenses_week_total numeric DEFAULT 0,
  last_refreshed_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_cache_user 
  ON dashboard_stats_cache(user_id, org_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_stats_cache_org 
  ON dashboard_stats_cache(org_id);

-- Enable RLS
ALTER TABLE dashboard_stats_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own stats
CREATE POLICY "Users can view own dashboard stats"
  ON dashboard_stats_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT ON dashboard_stats_cache TO authenticated;
GRANT ALL ON dashboard_stats_cache TO service_role;

COMMENT ON TABLE dashboard_stats_cache IS 
  'EPIC 26.9: Pre-computed dashboard statistics (now a table, not materialized view)';

-- The refresh_dashboard_stats_cache function will now work correctly
-- because it can DELETE/INSERT into a table

