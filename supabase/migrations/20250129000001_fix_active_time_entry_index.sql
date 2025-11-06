-- Fix active time entry query performance
-- Problem: Query filters by user_id + stop_at IS NULL + order by start_at
-- Existing index has org_id prefix but query doesn't use it
-- Solution: Create user-specific partial index for active entries

-- Drop redundant index if it exists
DROP INDEX IF EXISTS idx_time_entries_user_start;

-- Create optimal partial index for active time entries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_active 
  ON time_entries(user_id, start_at DESC)
  WHERE stop_at IS NULL;

COMMENT ON INDEX idx_time_entries_user_active IS 
  'Optimizes getActiveTimeEntry query: user_id + stop_at IS NULL + order by start_at';

-- Add covering index with all columns needed for the join
CREATE INDEX IF NOT EXISTS idx_time_entries_user_active_cover
  ON time_entries(user_id, start_at DESC, project_id, id, task_label, notes)
  WHERE stop_at IS NULL;

COMMENT ON INDEX idx_time_entries_user_active_cover IS 
  'Covering index for active time entries with project join - eliminates table lookup';





