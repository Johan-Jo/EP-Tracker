-- Migration: Add soft delete support to time_entries
-- Purpose: Prevent future data loss by implementing soft deletes instead of hard deletes
-- Date: 2025-01-26

-- ============================================================================
-- PART 1: Add deleted_at column to time_entries
-- ============================================================================

ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for efficient queries filtering out deleted entries
CREATE INDEX IF NOT EXISTS idx_time_entries_deleted_at 
ON time_entries(deleted_at) 
WHERE deleted_at IS NULL;

-- Add comment explaining the soft delete pattern
COMMENT ON COLUMN time_entries.deleted_at IS 
  'Soft delete timestamp. NULL means the entry is active. Set to timestamp when deleted.';

-- ============================================================================
-- PART 2: Update existing indexes to exclude deleted entries
-- ============================================================================

-- Note: Existing indexes will work, but we add partial indexes for better performance
-- when querying only active (non-deleted) entries

-- Index for active entries by org_id
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id_active 
ON time_entries(org_id) 
WHERE deleted_at IS NULL;

-- Index for active entries by project_id
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id_active 
ON time_entries(project_id) 
WHERE deleted_at IS NULL;

-- Index for active entries by user_id
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id_active 
ON time_entries(user_id) 
WHERE deleted_at IS NULL;

-- Index for active entries by start_at (for date range queries)
CREATE INDEX IF NOT EXISTS idx_time_entries_start_at_active 
ON time_entries(start_at) 
WHERE deleted_at IS NULL;

-- Index for active entries by status
CREATE INDEX IF NOT EXISTS idx_time_entries_status_active 
ON time_entries(status) 
WHERE deleted_at IS NULL;

-- ============================================================================
-- PART 3: Create function to safely delete time entries (soft delete)
-- ============================================================================

CREATE OR REPLACE FUNCTION soft_delete_time_entry(entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE time_entries
  SET deleted_at = NOW()
  WHERE id = entry_id
    AND deleted_at IS NULL;  -- Prevent double-deletion
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION soft_delete_time_entry IS 
  'Soft deletes a time entry by setting deleted_at timestamp. Returns true if entry was found and deleted.';

-- ============================================================================
-- PART 4: Create function to restore soft-deleted entries
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_time_entry(entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE time_entries
  SET deleted_at = NULL
  WHERE id = entry_id
    AND deleted_at IS NOT NULL;  -- Only restore if actually deleted
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION restore_time_entry IS 
  'Restores a soft-deleted time entry by clearing deleted_at. Returns true if entry was found and restored.';

-- ============================================================================
-- PART 5: Create view for active (non-deleted) time entries
-- ============================================================================

CREATE OR REPLACE VIEW time_entries_active AS
SELECT *
FROM time_entries
WHERE deleted_at IS NULL;

COMMENT ON VIEW time_entries_active IS 
  'View showing only active (non-deleted) time entries. Use this for normal queries.';

-- ============================================================================
-- PART 6: Grant permissions
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_time_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_time_entry(UUID) TO authenticated;

-- Grant select on view
GRANT SELECT ON time_entries_active TO authenticated;

-- ============================================================================
-- NOTES FOR APPLICATION CODE
-- ============================================================================

-- To use soft deletes in application code:
-- 
-- 1. Instead of: DELETE FROM time_entries WHERE id = ...
--    Use: UPDATE time_entries SET deleted_at = NOW() WHERE id = ...
--    Or: SELECT soft_delete_time_entry('entry-id');
--
-- 2. In queries, always filter out deleted entries:
--    SELECT * FROM time_entries WHERE deleted_at IS NULL AND ...
--    Or use the view: SELECT * FROM time_entries_active WHERE ...
--
-- 3. To restore a deleted entry:
--    SELECT restore_time_entry('entry-id');
--
-- 4. To see deleted entries (for admin/recovery):
--    SELECT * FROM time_entries WHERE deleted_at IS NOT NULL;
--
-- 5. To permanently delete (hard delete - use with caution):
--    DELETE FROM time_entries WHERE id = ... AND deleted_at IS NOT NULL;

