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

