-- Force drop materialized view and all dependencies
-- Then recreate as a regular table

-- Step 1: Drop all triggers that might depend on it
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_time_entry ON time_entries CASCADE;
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_material ON materials CASCADE;
DROP TRIGGER IF EXISTS trigger_refresh_stats_on_expense ON expenses CASCADE;

-- Step 2: Drop the materialized view with all dependencies
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats_cache CASCADE;

-- Step 3: Create as a regular table instead
CREATE TABLE dashboard_stats_cache (
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

-- Step 4: Create indexes
CREATE INDEX idx_dashboard_stats_cache_user 
  ON dashboard_stats_cache(user_id, org_id);

CREATE INDEX idx_dashboard_stats_cache_org 
  ON dashboard_stats_cache(org_id);

-- Step 5: Enable RLS
ALTER TABLE dashboard_stats_cache ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policy
CREATE POLICY "Users can view own dashboard stats"
  ON dashboard_stats_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Step 7: Grant permissions
GRANT SELECT ON dashboard_stats_cache TO authenticated;
GRANT ALL ON dashboard_stats_cache TO service_role;

-- Step 8: Recreate triggers (using the existing trigger functions)
CREATE TRIGGER trigger_refresh_stats_on_time_entry
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_dashboard_cache();

CREATE TRIGGER trigger_refresh_stats_on_material
  AFTER INSERT OR UPDATE OR DELETE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_dashboard_cache();

CREATE TRIGGER trigger_refresh_stats_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_dashboard_cache();

COMMENT ON TABLE dashboard_stats_cache IS 
  'EPIC 26.9: Pre-computed dashboard statistics (converted from materialized view to table)';

