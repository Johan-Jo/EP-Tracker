-- Migration: Add Project Archive Flag
-- Description: Add ability to archive projects to hide them from active lists
-- Date: 2025-12-01

-- Add archive columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id);

-- Add index for archived projects
CREATE INDEX IF NOT EXISTS idx_projects_is_archived
ON projects(is_archived) WHERE is_archived = FALSE;

-- Add comments for documentation
COMMENT ON COLUMN projects.is_archived IS 'Marks project as archived; archived projects are hidden from active lists and blocked for new entries';
COMMENT ON COLUMN projects.archived_at IS 'Timestamp when the project was archived';
COMMENT ON COLUMN projects.archived_by IS 'User who archived the project';

-- Helper function: check if project is archived
CREATE OR REPLACE FUNCTION is_project_archived(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM projects
        WHERE id = p_project_id
        AND is_archived = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_project_archived IS 'Returns true if the given project is archived';

-- Helper function: check if project is active (not archived)
CREATE OR REPLACE FUNCTION is_project_active(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM projects
        WHERE id = p_project_id
        AND is_archived = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_project_active IS 'Returns true if the given project is not archived';

