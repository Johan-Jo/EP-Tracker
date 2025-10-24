-- Add project_members table for project-level access control
-- This allows restricting user access to specific projects

-- ============================================================================
-- CREATE PROJECT_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_created_at ON project_members(created_at);

-- ============================================================================
-- ENABLE RLS ON PROJECT_MEMBERS
-- ============================================================================

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ADD HELPER FUNCTIONS FOR PROJECT ACCESS
-- ============================================================================

-- Check if user is assigned to a project
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM project_members 
        WHERE project_id = project_uuid 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can access project (is member, foreman, or admin)
CREATE OR REPLACE FUNCTION can_access_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_org_id UUID;
BEGIN
    -- Get project's organization
    SELECT org_id INTO project_org_id
    FROM projects
    WHERE id = project_uuid;
    
    IF project_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Admin and foreman can access all projects in their org
    IF is_foreman_or_admin(project_org_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Workers can only access projects they're assigned to
    RETURN is_project_member(project_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's accessible project IDs
CREATE OR REPLACE FUNCTION user_projects()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY 
    SELECT DISTINCT p.id
    FROM projects p
    WHERE 
        -- Admin/Foreman: all projects in their org
        is_foreman_or_admin(p.org_id)
        OR
        -- Worker: only assigned projects
        EXISTS (
            SELECT 1 
            FROM project_members pm 
            WHERE pm.project_id = p.id 
            AND pm.user_id = auth.uid()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- UPDATE PROJECTS RLS POLICIES
-- ============================================================================

-- Drop old project read policy
DROP POLICY IF EXISTS "Users can read org projects" ON projects;

-- New policy: Users can only read projects they have access to
CREATE POLICY "Users can read accessible projects"
    ON projects FOR SELECT
    USING (can_access_project(id));

-- Keep existing write policies (only foremen/admins can create/update)
-- No changes needed for INSERT/UPDATE/DELETE policies

-- ============================================================================
-- PROJECT_MEMBERS RLS POLICIES
-- ============================================================================

-- Users can read project members for projects they can access
CREATE POLICY "Users can read accessible project members"
    ON project_members FOR SELECT
    USING (can_access_project(project_id));

-- Foremen and admins can manage project members
CREATE POLICY "Foremen and admins can insert project members"
    ON project_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE id = project_id 
            AND is_foreman_or_admin(org_id)
        )
    );

CREATE POLICY "Foremen and admins can delete project members"
    ON project_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE id = project_id 
            AND is_foreman_or_admin(org_id)
        )
    );

-- ============================================================================
-- UPDATE PHASES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read org phases" ON phases;

CREATE POLICY "Users can read accessible phases"
    ON phases FOR SELECT
    USING (can_access_project(project_id));

-- ============================================================================
-- UPDATE WORK_ORDERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read org work orders" ON work_orders;

CREATE POLICY "Users can read accessible work orders"
    ON work_orders FOR SELECT
    USING (can_access_project(project_id));

-- ============================================================================
-- UPDATE TIME_ENTRIES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own time entries, foremen can read all" ON time_entries;

CREATE POLICY "Users can read own time entries or accessible project entries"
    ON time_entries FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id) OR
        can_access_project(project_id)
    );

-- Also ensure users can only insert time entries for projects they have access to
DROP POLICY IF EXISTS "Users can insert own time entries" ON time_entries;

CREATE POLICY "Users can insert time entries for accessible projects"
    ON time_entries FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id) AND
        can_access_project(project_id)
    );

-- ============================================================================
-- UPDATE MATERIALS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own materials, foremen can read all" ON materials;

CREATE POLICY "Users can read own materials or accessible project materials"
    ON materials FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id) OR
        can_access_project(project_id)
    );

DROP POLICY IF EXISTS "Users can insert own materials" ON materials;

CREATE POLICY "Users can insert materials for accessible projects"
    ON materials FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id) AND
        can_access_project(project_id)
    );

-- ============================================================================
-- UPDATE EXPENSES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own expenses, foremen can read all" ON expenses;

CREATE POLICY "Users can read own expenses or accessible project expenses"
    ON expenses FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id) OR
        can_access_project(project_id)
    );

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;

CREATE POLICY "Users can insert expenses for accessible projects"
    ON expenses FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id) AND
        can_access_project(project_id)
    );

-- ============================================================================
-- UPDATE MILEAGE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own mileage, foremen can read all" ON mileage;

CREATE POLICY "Users can read own mileage or accessible project mileage"
    ON mileage FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id) OR
        can_access_project(project_id)
    );

DROP POLICY IF EXISTS "Users can insert own mileage" ON mileage;

CREATE POLICY "Users can insert mileage for accessible projects"
    ON mileage FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id) AND
        can_access_project(project_id)
    );

-- ============================================================================
-- UPDATE ATA RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read org ATA" ON ata;

CREATE POLICY "Users can read accessible project ATA"
    ON ata FOR SELECT
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Users can insert ATA in their org" ON ata;

CREATE POLICY "Users can insert ATA for accessible projects"
    ON ata FOR INSERT
    WITH CHECK (
        is_org_member(org_id) AND
        can_access_project(project_id)
    );

-- ============================================================================
-- UPDATE DIARY_ENTRIES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read org diary entries" ON diary_entries;

CREATE POLICY "Users can read accessible project diary entries"
    ON diary_entries FOR SELECT
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Users can insert diary entries in their org" ON diary_entries;

CREATE POLICY "Users can insert diary entries for accessible projects"
    ON diary_entries FOR INSERT
    WITH CHECK (
        is_org_member(org_id) AND
        can_access_project(project_id)
    );

-- ============================================================================
-- UPDATE CHECKLISTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read org checklists" ON checklists;

CREATE POLICY "Users can read accessible project checklists"
    ON checklists FOR SELECT
    USING (can_access_project(project_id));

DROP POLICY IF EXISTS "Foremen can manage checklists" ON checklists;

CREATE POLICY "Foremen can manage checklists for accessible projects"
    ON checklists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE id = project_id 
            AND is_foreman_or_admin(org_id)
        )
    );

-- ============================================================================
-- MIGRATION: AUTO-ASSIGN EXISTING WORKERS TO ALL PROJECTS
-- ============================================================================
-- For existing data, assign all workers to all projects in their org
-- Admins and foremen already have access via their role

INSERT INTO project_members (project_id, user_id, assigned_by)
SELECT DISTINCT p.id as project_id, m.user_id, p.created_by as assigned_by
FROM projects p
CROSS JOIN memberships m
WHERE m.org_id = p.org_id
  AND m.is_active = TRUE
  AND m.role = 'worker'
ON CONFLICT (project_id, user_id) DO NOTHING;

COMMENT ON TABLE project_members IS 'Tracks which users are assigned to which projects for access control';
COMMENT ON FUNCTION can_access_project IS 'Returns true if user can access project (assigned, or is foreman/admin)';
COMMENT ON FUNCTION is_project_member IS 'Returns true if user is explicitly assigned to project';
COMMENT ON FUNCTION user_projects IS 'Returns all project IDs accessible by current user';

