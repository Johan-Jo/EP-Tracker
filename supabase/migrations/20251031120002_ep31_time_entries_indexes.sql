-- EPIC 31: Indexes to support Control view queries
-- Date: 2025-10-31

BEGIN;

-- Efficient project/time filtering
CREATE INDEX IF NOT EXISTS idx_time_entries_project_start_at
  ON time_entries(project_id, start_at);

-- Also index on user-time if needed for person filters
CREATE INDEX IF NOT EXISTS idx_time_entries_user_start_at
  ON time_entries(user_id, start_at);

COMMIT;