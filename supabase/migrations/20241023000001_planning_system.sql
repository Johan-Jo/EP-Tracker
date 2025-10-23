-- EP Tracker - Planning System
-- Week planner with assignments, absences, capacity tracking
-- Date: 2025-10-23

-- ============================================================================
-- EXTEND PROJECTS TABLE
-- ============================================================================

-- Add planning-specific columns to existing projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4F46E5',
ADD COLUMN IF NOT EXISTS daily_capacity_need INT DEFAULT 0;

COMMENT ON COLUMN projects.color IS 'Project color for planning UI (hex code)';
COMMENT ON COLUMN projects.daily_capacity_need IS 'Expected number of workers needed per day';

-- ============================================================================
-- ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_ts TIMESTAMPTZ NOT NULL,
    end_ts TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'cancelled')),
    address TEXT,
    note TEXT,
    sync_to_mobile BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_assignment_time CHECK (end_ts > start_ts)
);

CREATE INDEX idx_assignments_org_id ON assignments(org_id);
CREATE INDEX idx_assignments_project_id ON assignments(project_id);
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_user_date ON assignments(user_id, start_ts, end_ts);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_created_at ON assignments(created_at);

COMMENT ON TABLE assignments IS 'Work assignments for planning and scheduling';
COMMENT ON COLUMN assignments.all_day IS 'If true, assignment is for entire day (ignore specific times)';
COMMENT ON COLUMN assignments.sync_to_mobile IS 'If true, assignment appears in mobile today list';

-- ============================================================================
-- ABSENCES TABLE
-- ============================================================================

CREATE TABLE absences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'training')),
    start_ts TIMESTAMPTZ NOT NULL,
    end_ts TIMESTAMPTZ NOT NULL,
    note TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_absence_time CHECK (end_ts > start_ts)
);

CREATE INDEX idx_absences_org_id ON absences(org_id);
CREATE INDEX idx_absences_user_id ON absences(user_id);
CREATE INDEX idx_absences_user_date ON absences(user_id, start_ts, end_ts);
CREATE INDEX idx_absences_type ON absences(type);
CREATE INDEX idx_absences_created_at ON absences(created_at);

COMMENT ON TABLE absences IS 'User absences (vacation, sick leave, training)';

-- ============================================================================
-- SHIFT TEMPLATES TABLE
-- ============================================================================

CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week SMALLINT[] NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_shift_time CHECK (end_time > start_time)
);

CREATE INDEX idx_shift_templates_org_id ON shift_templates(org_id);
CREATE INDEX idx_shift_templates_is_default ON shift_templates(is_default);

COMMENT ON TABLE shift_templates IS 'Reusable shift templates (e.g., Standard Day 07-16)';
COMMENT ON COLUMN shift_templates.days_of_week IS 'Array of weekday numbers (1=Monday, 7=Sunday)';

-- ============================================================================
-- MOBILE NOTES TABLE
-- ============================================================================

CREATE TABLE mobile_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    pinned BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mobile_notes_assignment_id ON mobile_notes(assignment_id);
CREATE INDEX idx_mobile_notes_pinned ON mobile_notes(pinned);

COMMENT ON TABLE mobile_notes IS 'Pinned notes/instructions for mobile field workers';

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_absences_updated_at BEFORE UPDATE ON absences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mobile_notes_updated_at BEFORE UPDATE ON mobile_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Assignments RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments in their org"
    ON assignments FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY "Admin and foreman can create assignments"
    ON assignments FOR INSERT
    WITH CHECK (
        is_org_member(org_id) AND
        is_foreman_or_admin(org_id)
    );

CREATE POLICY "Admin and foreman can update assignments"
    ON assignments FOR UPDATE
    USING (
        is_org_member(org_id) AND
        is_foreman_or_admin(org_id)
    );

CREATE POLICY "Admin and foreman can delete assignments"
    ON assignments FOR DELETE
    USING (
        is_org_member(org_id) AND
        is_foreman_or_admin(org_id)
    );

-- Absences RLS
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view absences in their org"
    ON absences FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY "Admin and foreman can create any absence"
    ON absences FOR INSERT
    WITH CHECK (
        is_org_member(org_id) AND
        (is_foreman_or_admin(org_id) OR user_id = auth.uid())
    );

CREATE POLICY "Admin and foreman can update absences"
    ON absences FOR UPDATE
    USING (
        is_org_member(org_id) AND
        (is_foreman_or_admin(org_id) OR user_id = auth.uid())
    );

CREATE POLICY "Admin and foreman can delete absences"
    ON absences FOR DELETE
    USING (
        is_org_member(org_id) AND
        (is_foreman_or_admin(org_id) OR user_id = auth.uid())
    );

-- Shift Templates RLS
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shift templates in their org"
    ON shift_templates FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY "Admin and foreman can manage shift templates"
    ON shift_templates FOR ALL
    USING (
        is_org_member(org_id) AND
        is_foreman_or_admin(org_id)
    );

-- Mobile Notes RLS
ALTER TABLE mobile_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mobile notes for their assignments"
    ON mobile_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_id
            AND is_org_member(a.org_id)
        )
    );

CREATE POLICY "Admin and foreman can manage mobile notes"
    ON mobile_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.id = assignment_id
            AND is_org_member(a.org_id)
            AND is_foreman_or_admin(a.org_id)
        )
    );

