-- EP Time Tracker - Row Level Security Policies
-- Phase 1 MVP: Multi-tenant security with RLS
-- Author: EP Tracker Team
-- Date: 2025-10-18

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION is_org_member(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM memberships 
        WHERE user_id = auth.uid() 
        AND org_id = org_uuid 
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role in organization
CREATE OR REPLACE FUNCTION user_role(org_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM memberships 
        WHERE user_id = auth.uid() 
        AND org_id = org_uuid 
        AND is_active = TRUE
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is admin in organization
CREATE OR REPLACE FUNCTION is_org_admin(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_role(org_uuid) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is foreman or admin
CREATE OR REPLACE FUNCTION is_foreman_or_admin(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_role(org_uuid) IN ('foreman', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's organizations
CREATE OR REPLACE FUNCTION user_orgs()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY 
    SELECT org_id 
    FROM memberships 
    WHERE user_id = auth.uid() 
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE ata ENABLE ROW LEVEL SECURITY;
ALTER TABLE ata_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Organizations: Users can read their own orgs
CREATE POLICY "Users can read their organizations"
    ON organizations FOR SELECT
    USING (id IN (SELECT user_orgs()));

-- Organizations: Admins can update their org
CREATE POLICY "Admins can update their organization"
    ON organizations FOR UPDATE
    USING (is_org_admin(id));

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Profiles: Users can read profiles in their org
CREATE POLICY "Users can read org member profiles"
    ON profiles FOR SELECT
    USING (
        id = auth.uid() OR
        id IN (
            SELECT user_id 
            FROM memberships 
            WHERE org_id IN (SELECT user_orgs())
        )
    );

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

-- Profiles: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- MEMBERSHIPS POLICIES
-- ============================================================================

-- Memberships: Users can read memberships in their org
CREATE POLICY "Users can read org memberships"
    ON memberships FOR SELECT
    USING (org_id IN (SELECT user_orgs()));

-- Memberships: Admins can manage memberships
CREATE POLICY "Admins can insert memberships"
    ON memberships FOR INSERT
    WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Admins can update memberships"
    ON memberships FOR UPDATE
    USING (is_org_admin(org_id));

CREATE POLICY "Admins can delete memberships"
    ON memberships FOR DELETE
    USING (is_org_admin(org_id));

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Projects: Users can read projects in their org
CREATE POLICY "Users can read org projects"
    ON projects FOR SELECT
    USING (is_org_member(org_id));

-- Projects: Foremen and admins can manage projects
CREATE POLICY "Foremen and admins can insert projects"
    ON projects FOR INSERT
    WITH CHECK (is_foreman_or_admin(org_id));

CREATE POLICY "Foremen and admins can update projects"
    ON projects FOR UPDATE
    USING (is_foreman_or_admin(org_id));

CREATE POLICY "Admins can delete projects"
    ON projects FOR DELETE
    USING (is_org_admin(org_id));

-- ============================================================================
-- PHASES POLICIES
-- ============================================================================

-- Phases: Users can read phases in their org
CREATE POLICY "Users can read org phases"
    ON phases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = phases.project_id 
            AND is_org_member(projects.org_id)
        )
    );

-- Phases: Foremen and admins can manage phases
CREATE POLICY "Foremen and admins can manage phases"
    ON phases FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = phases.project_id 
            AND is_foreman_or_admin(projects.org_id)
        )
    );

-- ============================================================================
-- WORK ORDERS POLICIES
-- ============================================================================

-- Work orders: Users can read work orders in their org
CREATE POLICY "Users can read org work orders"
    ON work_orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = work_orders.project_id 
            AND is_org_member(projects.org_id)
        )
    );

-- Work orders: Foremen and admins can manage work orders
CREATE POLICY "Foremen and admins can manage work orders"
    ON work_orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = work_orders.project_id 
            AND is_foreman_or_admin(projects.org_id)
        )
    );

-- ============================================================================
-- TIME ENTRIES POLICIES
-- ============================================================================

-- Time entries: Users can read their own entries and foremen/admins can read all
CREATE POLICY "Users can read own time entries, foremen can read all"
    ON time_entries FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id)
    );

-- Time entries: Users can insert their own entries
CREATE POLICY "Users can insert own time entries"
    ON time_entries FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id)
    );

-- Time entries: Users can update their own draft entries
CREATE POLICY "Users can update own draft time entries"
    ON time_entries FOR UPDATE
    USING (
        user_id = auth.uid() AND
        status = 'draft'
    );

-- Time entries: Foremen and admins can approve entries
CREATE POLICY "Foremen and admins can approve time entries"
    ON time_entries FOR UPDATE
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- Time entries: Users can delete their own draft entries
CREATE POLICY "Users can delete own draft time entries"
    ON time_entries FOR DELETE
    USING (
        user_id = auth.uid() AND
        status = 'draft'
    );

-- ============================================================================
-- MATERIALS POLICIES
-- ============================================================================

-- Materials: Users can read their own entries and foremen/admins can read all
CREATE POLICY "Users can read own materials, foremen can read all"
    ON materials FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id)
    );

-- Materials: Users can insert their own entries
CREATE POLICY "Users can insert own materials"
    ON materials FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id)
    );

-- Materials: Users can update their own draft entries
CREATE POLICY "Users can update own draft materials"
    ON materials FOR UPDATE
    USING (
        user_id = auth.uid() AND
        status = 'draft'
    );

-- Materials: Foremen and admins can approve materials
CREATE POLICY "Foremen and admins can approve materials"
    ON materials FOR UPDATE
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- Materials: Users can delete their own draft entries
CREATE POLICY "Users can delete own draft materials"
    ON materials FOR DELETE
    USING (
        user_id = auth.uid() AND
        status = 'draft'
    );

-- ============================================================================
-- EXPENSES POLICIES
-- ============================================================================

-- Expenses: Users can read their own entries and foremen/admins can read all
CREATE POLICY "Users can read own expenses, foremen can read all"
    ON expenses FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id)
    );

-- Expenses: Users can insert their own entries
CREATE POLICY "Users can insert own expenses"
    ON expenses FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id)
    );

-- Expenses: Users can update their own draft entries
CREATE POLICY "Users can update own draft expenses"
    ON expenses FOR UPDATE
    USING (
        user_id = auth.uid() AND
        status = 'draft'
    );

-- Expenses: Foremen and admins can approve expenses
CREATE POLICY "Foremen and admins can approve expenses"
    ON expenses FOR UPDATE
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- Expenses: Users can delete their own draft entries
CREATE POLICY "Users can delete own draft expenses"
    ON expenses FOR DELETE
    USING (
        user_id = auth.uid() AND
        status = 'draft'
    );

-- ============================================================================
-- MILEAGE POLICIES
-- ============================================================================

-- Mileage: Users can read their own entries and foremen/admins can read all
CREATE POLICY "Users can read own mileage, foremen can read all"
    ON mileage FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id)
    );

-- Mileage: Users can manage their own draft entries
CREATE POLICY "Users can manage own mileage"
    ON mileage FOR ALL
    USING (
        user_id = auth.uid() AND
        (status = 'draft' OR user_id = auth.uid())
    )
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id)
    );

-- Mileage: Foremen and admins can approve mileage
CREATE POLICY "Foremen and admins can approve mileage"
    ON mileage FOR UPDATE
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- ============================================================================
-- TRAVEL TIME POLICIES
-- ============================================================================

-- Travel time: Users can read their own entries and foremen/admins can read all
CREATE POLICY "Users can read own travel time, foremen can read all"
    ON travel_time FOR SELECT
    USING (
        user_id = auth.uid() OR
        is_foreman_or_admin(org_id)
    );

-- Travel time: Users can manage their own draft entries
CREATE POLICY "Users can manage own travel time"
    ON travel_time FOR ALL
    USING (
        user_id = auth.uid() AND
        (status = 'draft' OR user_id = auth.uid())
    )
    WITH CHECK (
        user_id = auth.uid() AND
        is_org_member(org_id)
    );

-- Travel time: Foremen and admins can approve travel time
CREATE POLICY "Foremen and admins can approve travel time"
    ON travel_time FOR UPDATE
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- ============================================================================
-- ÄTA POLICIES
-- ============================================================================

-- ÄTA: Users can read ÄTA in their org
CREATE POLICY "Users can read org ata"
    ON ata FOR SELECT
    USING (is_org_member(org_id));

-- ÄTA: Foremen and admins can manage ÄTA
CREATE POLICY "Foremen and admins can manage ata"
    ON ata FOR ALL
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- ÄTA Photos: Users can read photos for ÄTA they can see
CREATE POLICY "Users can read ata photos"
    ON ata_photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ata 
            WHERE ata.id = ata_photos.ata_id 
            AND is_org_member(ata.org_id)
        )
    );

-- ÄTA Photos: Foremen and admins can manage photos
CREATE POLICY "Foremen and admins can manage ata photos"
    ON ata_photos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM ata 
            WHERE ata.id = ata_photos.ata_id 
            AND is_foreman_or_admin(ata.org_id)
        )
    );

-- ============================================================================
-- DIARY ENTRIES POLICIES
-- ============================================================================

-- Diary: Users can read diary entries in their org
CREATE POLICY "Users can read org diary entries"
    ON diary_entries FOR SELECT
    USING (is_org_member(org_id));

-- Diary: Foremen and admins can manage diary entries
CREATE POLICY "Foremen and admins can manage diary entries"
    ON diary_entries FOR ALL
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- Diary Photos: Users can read photos for diary entries they can see
CREATE POLICY "Users can read diary photos"
    ON diary_photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM diary_entries 
            WHERE diary_entries.id = diary_photos.diary_entry_id 
            AND is_org_member(diary_entries.org_id)
        )
    );

-- Diary Photos: Foremen and admins can manage photos
CREATE POLICY "Foremen and admins can manage diary photos"
    ON diary_photos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM diary_entries 
            WHERE diary_entries.id = diary_photos.diary_entry_id 
            AND is_foreman_or_admin(diary_entries.org_id)
        )
    );

-- ============================================================================
-- CHECKLIST TEMPLATES POLICIES
-- ============================================================================

-- Checklist templates: Users can read public templates and their org templates
CREATE POLICY "Users can read checklist templates"
    ON checklist_templates FOR SELECT
    USING (
        is_public = TRUE OR
        (org_id IS NOT NULL AND is_org_member(org_id))
    );

-- Checklist templates: Admins can manage org templates
CREATE POLICY "Admins can manage org checklist templates"
    ON checklist_templates FOR ALL
    USING (org_id IS NOT NULL AND is_org_admin(org_id))
    WITH CHECK (org_id IS NOT NULL AND is_org_admin(org_id));

-- ============================================================================
-- CHECKLISTS POLICIES
-- ============================================================================

-- Checklists: Users can read checklists in their org
CREATE POLICY "Users can read org checklists"
    ON checklists FOR SELECT
    USING (is_org_member(org_id));

-- Checklists: Foremen and admins can manage checklists
CREATE POLICY "Foremen and admins can manage checklists"
    ON checklists FOR ALL
    USING (is_foreman_or_admin(org_id))
    WITH CHECK (is_foreman_or_admin(org_id));

-- ============================================================================
-- APPROVALS POLICIES
-- ============================================================================

-- Approvals: Users can read approvals in their org
CREATE POLICY "Users can read org approvals"
    ON approvals FOR SELECT
    USING (is_org_member(org_id));

-- Approvals: Foremen and admins can create approvals
CREATE POLICY "Foremen and admins can create approvals"
    ON approvals FOR INSERT
    WITH CHECK (is_foreman_or_admin(org_id));

-- ============================================================================
-- INTEGRATION BATCHES POLICIES
-- ============================================================================

-- Integration batches: Users can read batches in their org
CREATE POLICY "Users can read org integration batches"
    ON integration_batches FOR SELECT
    USING (is_org_member(org_id));

-- Integration batches: Admins can create batches
CREATE POLICY "Admins can create integration batches"
    ON integration_batches FOR INSERT
    WITH CHECK (is_org_admin(org_id));

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Audit log: Admins can read audit log
CREATE POLICY "Admins can read audit log"
    ON audit_log FOR SELECT
    USING (is_org_admin(org_id));

-- Audit log: System can insert (service role only)
CREATE POLICY "System can insert audit log"
    ON audit_log FOR INSERT
    WITH CHECK (TRUE);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant authenticated users access to functions
GRANT EXECUTE ON FUNCTION is_org_member TO authenticated;
GRANT EXECUTE ON FUNCTION user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_org_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_foreman_or_admin TO authenticated;
GRANT EXECUTE ON FUNCTION user_orgs TO authenticated;

