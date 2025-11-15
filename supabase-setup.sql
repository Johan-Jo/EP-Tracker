-- EP Time Tracker - Combined Migrations
-- Generated: 2025-10-18T21:39:54.433Z
-- Run this entire script in Supabase SQL Editor
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy ALL contents of this file
-- 5. Paste into the editor
-- 6. Click "Run" or press Ctrl+Enter
-- 7. Wait for success message (~10-30 seconds)
--
-- ============================================================================


-- ============================================================================
-- MIGRATION 1/3: 20241018000001_initial_schema.sql
-- ============================================================================

-- EP Time Tracker - Initial Database Schema
-- Phase 1 MVP: Multi-tenant time tracking and site reporting
-- Author: EP Tracker Team
-- Date: 2025-10-18

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ORGANIZATIONS & USERS
-- ============================================================================

-- Organizations table (multi-tenant root)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- Organization memberships (user <-> org mapping)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'foreman', 'worker')),
    hourly_rate_sek DECIMAL(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE INDEX idx_memberships_org_id ON memberships(org_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_role ON memberships(role);

-- ============================================================================
-- PROJECTS & STRUCTURE
-- ============================================================================

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    project_number TEXT,
    client_name TEXT,
    site_address TEXT,
    site_lat DECIMAL(10, 7),
    site_lon DECIMAL(10, 7),
    geo_fence_radius_m INTEGER DEFAULT 100,
    budget_mode TEXT NOT NULL DEFAULT 'none' CHECK (budget_mode IN ('none', 'hours', 'amount', 'ep_sync')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Project phases (optional grouping within projects)
CREATE TABLE phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phases_project_id ON phases(project_id);
CREATE INDEX idx_phases_sort_order ON phases(sort_order);

-- Work orders (sub-tasks within phases)
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX idx_work_orders_phase_id ON work_orders(phase_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);

-- ============================================================================
-- TIME TRACKING
-- ============================================================================

-- Time entries
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_label TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    stop_at TIMESTAMPTZ,
    duration_min INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN stop_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (stop_at - start_at)) / 60
            ELSE NULL 
        END
    ) STORED,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (stop_at IS NULL OR stop_at > start_at)
);

CREATE INDEX idx_time_entries_org_id ON time_entries(org_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_start_at ON time_entries(start_at);
CREATE INDEX idx_time_entries_created_at ON time_entries(created_at);

-- ============================================================================
-- MATERIALS & EXPENSES
-- ============================================================================

-- Materials
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    qty DECIMAL(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    unit_price_sek DECIMAL(10, 2) NOT NULL,
    total_sek DECIMAL(10, 2) GENERATED ALWAYS AS (qty * unit_price_sek) STORED,
    photo_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_org_id ON materials(org_id);
CREATE INDEX idx_materials_project_id ON materials(project_id);
CREATE INDEX idx_materials_user_id ON materials(user_id);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_materials_created_at ON materials(created_at);

-- Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT,
    description TEXT NOT NULL,
    amount_sek DECIMAL(10, 2) NOT NULL,
    vat BOOLEAN NOT NULL DEFAULT TRUE,
    photo_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_org_id ON expenses(org_id);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);

-- Mileage tracking
CREATE TABLE mileage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    km DECIMAL(10, 2) NOT NULL,
    rate_per_km_sek DECIMAL(10, 2) NOT NULL,
    total_sek DECIMAL(10, 2) GENERATED ALWAYS AS (km * rate_per_km_sek) STORED,
    from_location TEXT,
    to_location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mileage_org_id ON mileage(org_id);
CREATE INDEX idx_mileage_project_id ON mileage(project_id);
CREATE INDEX idx_mileage_user_id ON mileage(user_id);
CREATE INDEX idx_mileage_date ON mileage(date);
CREATE INDEX idx_mileage_status ON mileage(status);

-- Travel time
CREATE TABLE travel_time (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    duration_min INTEGER NOT NULL,
    from_location TEXT,
    to_location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_travel_time_org_id ON travel_time(org_id);
CREATE INDEX idx_travel_time_project_id ON travel_time(project_id);
CREATE INDEX idx_travel_time_user_id ON travel_time(user_id);
CREATE INDEX idx_travel_time_date ON travel_time(date);
CREATE INDEX idx_travel_time_status ON travel_time(status);

-- ============================================================================
-- ÄTA (CHANGE ORDERS)
-- ============================================================================

-- ÄTA entries
CREATE TABLE ata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    ata_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    qty DECIMAL(10, 2),
    unit TEXT,
    unit_price_sek DECIMAL(10, 2),
    total_sek DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN qty IS NOT NULL AND unit_price_sek IS NOT NULL 
            THEN qty * unit_price_sek 
            ELSE NULL 
        END
    ) STORED,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'invoiced')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    signature_name TEXT,
    signature_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ata_org_id ON ata(org_id);
CREATE INDEX idx_ata_project_id ON ata(project_id);
CREATE INDEX idx_ata_created_by ON ata(created_by);
CREATE INDEX idx_ata_status ON ata(status);
CREATE INDEX idx_ata_created_at ON ata(created_at);

-- ÄTA photos
CREATE TABLE ata_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ata_id UUID NOT NULL REFERENCES ata(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ata_photos_ata_id ON ata_photos(ata_id);
CREATE INDEX idx_ata_photos_sort_order ON ata_photos(sort_order);

-- ============================================================================
-- DAILY DIARY
-- ============================================================================

-- Diary entries (AFC-style daily reports)
CREATE TABLE diary_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    date DATE NOT NULL,
    weather TEXT,
    temperature_c INTEGER,
    crew_count INTEGER,
    work_performed TEXT,
    obstacles TEXT,
    safety_notes TEXT,
    deliveries TEXT,
    visitors TEXT,
    signature_name TEXT,
    signature_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, date)
);

CREATE INDEX idx_diary_entries_org_id ON diary_entries(org_id);
CREATE INDEX idx_diary_entries_project_id ON diary_entries(project_id);
CREATE INDEX idx_diary_entries_date ON diary_entries(date);
CREATE INDEX idx_diary_entries_created_by ON diary_entries(created_by);

-- Diary photos
CREATE TABLE diary_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diary_entry_id UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diary_photos_diary_entry_id ON diary_photos(diary_entry_id);
CREATE INDEX idx_diary_photos_sort_order ON diary_photos(sort_order);

-- ============================================================================
-- CHECKLISTS
-- ============================================================================

-- Checklist templates (reusable templates)
CREATE TABLE checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    template_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_templates_org_id ON checklist_templates(org_id);
CREATE INDEX idx_checklist_templates_category ON checklist_templates(category);
CREATE INDEX idx_checklist_templates_is_public ON checklist_templates(is_public);

-- Checklist instances (completed checklists)
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    name TEXT NOT NULL,
    completed_at TIMESTAMPTZ,
    checklist_data JSONB NOT NULL,
    signature_name TEXT,
    signature_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_org_id ON checklists(org_id);
CREATE INDEX idx_checklists_project_id ON checklists(project_id);
CREATE INDEX idx_checklists_template_id ON checklists(template_id);
CREATE INDEX idx_checklists_created_by ON checklists(created_by);
CREATE INDEX idx_checklists_completed_at ON checklists(completed_at);

-- ============================================================================
-- APPROVALS & EXPORTS
-- ============================================================================

-- Approval batches (weekly/period approvals)
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    approved_by UUID NOT NULL REFERENCES profiles(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approvals_org_id ON approvals(org_id);
CREATE INDEX idx_approvals_project_id ON approvals(project_id);
CREATE INDEX idx_approvals_approved_by ON approvals(approved_by);
CREATE INDEX idx_approvals_period ON approvals(period_start, period_end);

-- Export batches (CSV export tracking)
CREATE TABLE integration_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    batch_type TEXT NOT NULL CHECK (batch_type IN ('salary_csv', 'invoice_csv', 'attachments_zip')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    file_url TEXT,
    file_size_bytes BIGINT,
    record_count INTEGER,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integration_batches_org_id ON integration_batches(org_id);
CREATE INDEX idx_integration_batches_created_by ON integration_batches(created_by);
CREATE INDEX idx_integration_batches_period ON integration_batches(period_start, period_end);
CREATE INDEX idx_integration_batches_created_at ON integration_batches(created_at);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- Audit trail
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mileage_updated_at BEFORE UPDATE ON mileage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travel_time_updated_at BEFORE UPDATE ON travel_time FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ata_updated_at BEFORE UPDATE ON ata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diary_entries_updated_at BEFORE UPDATE ON diary_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON checklist_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organization root';
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE memberships IS 'User-organization relationships with roles';
COMMENT ON TABLE projects IS 'Construction projects';
COMMENT ON TABLE phases IS 'Project phases for work grouping';
COMMENT ON TABLE work_orders IS 'Work orders within phases';
COMMENT ON TABLE time_entries IS 'Time tracking entries with auto-calculated duration';
COMMENT ON TABLE materials IS 'Material purchases and usage';
COMMENT ON TABLE expenses IS 'Expense tracking with receipts';
COMMENT ON TABLE mileage IS 'Mileage tracking with auto-calculated totals';
COMMENT ON TABLE travel_time IS 'Travel time tracking';
COMMENT ON TABLE ata IS 'ÄTA (change orders) with approval workflow';
COMMENT ON TABLE ata_photos IS 'Photos attached to ÄTA entries';
COMMENT ON TABLE diary_entries IS 'AFC-style daily diary entries';
COMMENT ON TABLE diary_photos IS 'Photos attached to diary entries';
COMMENT ON TABLE checklist_templates IS 'Reusable checklist templates';
COMMENT ON TABLE checklists IS 'Completed checklist instances';
COMMENT ON TABLE approvals IS 'Approval batches for time/materials';
COMMENT ON TABLE integration_batches IS 'Export batch tracking (CSV, ZIP)';
COMMENT ON TABLE audit_log IS 'Complete audit trail for all changes';




-- ============================================================================
-- MIGRATION 2/3: 20241018000002_rls_policies.sql
-- ============================================================================

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




-- ============================================================================
-- MIGRATION 3/3: 20241018000003_seed_data.sql
-- ============================================================================

-- EP Time Tracker - Seed Data for Pilot Organization
-- Phase 1 MVP: Default data and public checklist templates
-- Author: EP Tracker Team
-- Date: 2025-10-18

-- ============================================================================
-- PUBLIC CHECKLIST TEMPLATES (Swedish Construction Standards)
-- ============================================================================

-- Riskanalys (Risk Analysis) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Riskanalys',
    'Standardmall för riskanalys på byggarbetsplats enligt AFS 2001:1',
    'safety',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Allmän information',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Plats', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Utförd av', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Identifierade risker',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Fall från höjd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Fallande föremål'),
                    jsonb_build_object('type', 'checkbox', 'label', 'El-risker'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Brand/explosion'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Kemikalier'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Buller'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Damm'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Vibrationer'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Tunga lyft'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Maskiner/verktyg'),
                    jsonb_build_object('type', 'text', 'label', 'Övriga risker (specificera)', 'multiline', true)
                )
            ),
            jsonb_build_object(
                'title', 'Åtgärder',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Risk 1 - Åtgärd', 'multiline', true),
                    jsonb_build_object('type', 'text', 'label', 'Risk 2 - Åtgärd', 'multiline', true),
                    jsonb_build_object('type', 'text', 'label', 'Risk 3 - Åtgärd', 'multiline', true),
                    jsonb_build_object('type', 'text', 'label', 'Övriga åtgärder', 'multiline', true)
                )
            ),
            jsonb_build_object(
                'title', 'Uppföljning',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Åtgärder genomförda'),
                    jsonb_build_object('type', 'date', 'label', 'Uppföljningsdatum'),
                    jsonb_build_object('type', 'text', 'label', 'Ansvarig för uppföljning')
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- Egenkontroll Målning (Self-Inspection Painting) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Egenkontroll Målning',
    'Kontrollmall för målningsarbete enligt AMA Hus',
    'quality',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Projekt & Plats',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Rum/Utrymme', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Kontrollant', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Förberedelser',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Underlag rengjort'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Underlag torrt'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Temperatur >10°C'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Luftfuktighet <80%'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Grundning applicerad'),
                    jsonb_build_object('type', 'text', 'label', 'Produkter (typ och kulör)', 'multiline', true)
                )
            ),
            jsonb_build_object(
                'title', 'Utförande',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Täckning av ytor OK'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Inga rinnmärken'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Jämn ytfinish'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Antal strykningar enligt spec'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Torktider följda'),
                    jsonb_build_object('type', 'photo', 'label', 'Foto på utfört arbete')
                )
            ),
            jsonb_build_object(
                'title', 'Slutkontroll',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Kulör godkänd av beställare'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Inga defekter'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Städning utförd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Arbetet godkänt'),
                    jsonb_build_object('type', 'text', 'label', 'Kommentarer', 'multiline', true)
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- Egenkontroll Golv (Self-Inspection Flooring) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Egenkontroll Golv',
    'Kontrollmall för golvläggning enligt AMA Hus',
    'quality',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Projekt & Plats',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Rum/Utrymme', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Kontrollant', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Undergolv',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Undergolv rent och torrt'),
                    jsonb_build_object('type', 'checkbox', 'label', 'RF-mätning utförd'),
                    jsonb_build_object('type', 'text', 'label', 'RF-värde (%)'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Planhet kontrollerad'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Sprickor åtgärdade'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Grundning applicerad')
                )
            ),
            jsonb_build_object(
                'title', 'Golvläggning',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Golvmaterial (typ och artikelnr)'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Material lagrat enligt tillverkarens anvisningar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Temperatur 18-25°C'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Luftfuktighet 30-60%'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Lim/metod enligt spec'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Fogar raka och jämna'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Sockel monterad'),
                    jsonb_build_object('type', 'photo', 'label', 'Foto på utfört arbete')
                )
            ),
            jsonb_build_object(
                'title', 'Slutkontroll',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Ingen buktning eller vågor'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Inga synliga skarvar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Städning utförd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Arbetet godkänt'),
                    jsonb_build_object('type', 'text', 'label', 'Kommentarer', 'multiline', true)
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- Skyddskontroll enligt AFS (Protection Control) Template
INSERT INTO checklist_templates (id, org_id, name, description, category, is_public, template_data, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    NULL,
    'Skyddskontroll AFS',
    'Kontroll av skydd och säkerhetsåtgärder enligt AFS 1999:3',
    'safety',
    TRUE,
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object(
                'title', 'Allmänt',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'label', 'Projekt', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Plats', 'required', true),
                    jsonb_build_object('type', 'date', 'label', 'Datum', 'required', true),
                    jsonb_build_object('type', 'text', 'label', 'Kontrollant', 'required', true)
                )
            ),
            jsonb_build_object(
                'title', 'Personlig Skyddsutrustning',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Hjälm'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyddsglasögon'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Hörselskydd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Andningsskydd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyddshandskar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Säkerhetsskor'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Varselkläder')
                )
            ),
            jsonb_build_object(
                'title', 'Arbetsmiljö',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Räcken och skyddsräcken'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Fallskyddsutrustning'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Brandsläckare tillgänglig'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Nödutgångar fria'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Belysning tillräcklig'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Ventilation fungerar'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Första hjälpen utrustning'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyltar och varningar uppsatta')
                )
            ),
            jsonb_build_object(
                'title', 'Verktyg & Maskiner',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Elverktyg jordfelsbrytare'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Skyddskåpor på plats'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Verktyg i gott skick'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Stegar säkra'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Ställningar godkända')
                )
            ),
            jsonb_build_object(
                'title', 'Dokumentation',
                'items', jsonb_build_array(
                    jsonb_build_object('type', 'checkbox', 'label', 'Riskanalys genomförd'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Arbetsbeskrivning finns'),
                    jsonb_build_object('type', 'checkbox', 'label', 'Säkerhetsdatablad tillgängliga'),
                    jsonb_build_object('type', 'photo', 'label', 'Foto på arbetsplatsen'),
                    jsonb_build_object('type', 'text', 'label', 'Avvikelser och åtgärder', 'multiline', true)
                )
            )
        )
    ),
    NOW(),
    NOW()
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE checklist_templates IS 'Includes public Swedish construction standard templates';


