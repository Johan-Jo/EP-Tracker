-- Migration: Add Project Locks
-- Description: Add ability to lock projects to prevent changes after completion/billing
-- Date: 2025-10-22

-- Add is_locked column to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lock_reason TEXT;

-- Add index for locked projects
CREATE INDEX IF NOT EXISTS idx_projects_is_locked ON projects(is_locked) WHERE is_locked = TRUE;

-- Add comment
COMMENT ON COLUMN projects.is_locked IS 'Prevents any changes to time entries, costs, etc. for this project';
COMMENT ON COLUMN projects.locked_by IS 'User who locked the project';
COMMENT ON COLUMN projects.locked_at IS 'When the project was locked';
COMMENT ON COLUMN projects.lock_reason IS 'Reason for locking (e.g., invoiced, completed)';

-- Helper function to check if a project is locked
CREATE OR REPLACE FUNCTION is_project_locked(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM projects
        WHERE id = p_project_id
        AND is_locked = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_project_locked IS 'Check if a project is locked';

