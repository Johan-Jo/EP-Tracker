-- EP Tracker - Work Orders M1 Schema
-- Implements work orders (arbetsorder) as central job card system
-- Date: 2025-02-03
-- EPIC: 49 - Work Orders Foundation

-- ============================================================================
-- DROP EXISTING WORK_ORDERS TABLE (Fresh Start)
-- ============================================================================

-- Drop existing work_orders table and recreate with full schema
DROP TABLE IF EXISTS work_orders CASCADE;

-- ============================================================================
-- WORK ORDERS TABLE
-- ============================================================================

CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Identification
    work_order_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    
    -- Status & Priority
    status TEXT NOT NULL DEFAULT 'PLANERAD' CHECK (status IN ('PLANERAD', 'PÅGÅENDE', 'KLAR', 'FAKTURERAD', 'AVBOKAD')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'AKUT')),
    
    -- Planning
    planned_start_at TIMESTAMPTZ,
    planned_end_at TIMESTAMPTZ,
    actual_start_at TIMESTAMPTZ,
    actual_end_at TIMESTAMPTZ,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Type
    work_order_type TEXT NOT NULL DEFAULT 'PROJEKTBUNDEN' CHECK (work_order_type IN ('PROJEKTBUNDEN', 'FRISTÅENDE')),
    
    -- Location
    location_address TEXT,
    location_city TEXT,
    location_zip TEXT,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    door_code TEXT,
    location_notes TEXT,
    
    -- Notes
    internal_notes TEXT,
    external_summary TEXT, -- "Vad har utförts?" for invoice
    
    -- Metadata
    created_by_id UUID REFERENCES profiles(id),
    closed_by_id UUID REFERENCES profiles(id),
    closed_at TIMESTAMPTZ,
    
    -- Signature
    signature_blob_url TEXT,
    
    -- Billing
    billing_type_override TEXT, -- nullable, defaults to project/ÄTA billing type
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_planned_time_range CHECK (planned_end_at IS NULL OR planned_start_at IS NULL OR planned_end_at > planned_start_at),
    CONSTRAINT valid_actual_time_range CHECK (actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at > actual_start_at)
);

-- Indexes
CREATE INDEX idx_work_orders_org_id ON work_orders(organization_id);
CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_planned_start_at ON work_orders(planned_start_at);
CREATE INDEX idx_work_orders_planned_end_at ON work_orders(planned_end_at);
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at);
CREATE UNIQUE INDEX idx_work_orders_number ON work_orders(work_order_number);

-- ============================================================================
-- WORK ORDER ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE work_order_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT, -- Simple text in M1
    is_responsible BOOLEAN NOT NULL DEFAULT FALSE,
    assignment_status TEXT NOT NULL DEFAULT 'TILLDELAD' CHECK (assignment_status IN ('TILLDELAD', 'KLARMARKERAD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one assignment per user per work order
    UNIQUE(work_order_id, user_id)
);

-- Indexes
CREATE INDEX idx_work_order_assignments_work_order_id ON work_order_assignments(work_order_id);
CREATE INDEX idx_work_order_assignments_user_id ON work_order_assignments(user_id);
CREATE INDEX idx_work_order_assignments_responsible ON work_order_assignments(work_order_id, is_responsible) WHERE is_responsible = true;

-- ============================================================================
-- DIARY ENTRIES EXTENSION
-- ============================================================================

-- Add work_order_id to diary_entries (nullable for backward compatibility)
ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_diary_entries_work_order_id ON diary_entries(work_order_id);

-- ============================================================================
-- WORK ORDER NUMBER GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_work_order_number(p_org_id UUID, p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_num INTEGER;
    v_number TEXT;
    v_lock_key BIGINT;
    v_retry_count INTEGER := 0;
    v_max_retries INTEGER := 10;
BEGIN
    -- Use advisory lock based on org_id and year to prevent race conditions
    -- Convert UUID to bigint for lock (using hash)
    v_lock_key := ('x' || substr(md5(p_org_id::TEXT || p_year::TEXT), 1, 16))::bit(64)::bigint;
    
    -- Acquire lock (wait up to 5 seconds)
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- Get the next sequential number for this org and year
    -- Use FOR UPDATE to lock the rows during the transaction
    SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 8) AS INTEGER)), 0) + 1
    INTO v_next_num
    FROM work_orders
    WHERE organization_id = p_org_id
      AND work_order_number LIKE 'WO-' || p_year || '-%'
    FOR UPDATE;
    
    -- Format: WO-YYYY-NNN
    v_number := 'WO-' || p_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
    
    -- Lock is automatically released when transaction commits/rolls back
    RETURN v_number;
END;
$$;

-- ============================================================================
-- TRIGGER: AUTO-GENERATE WORK ORDER NUMBER
-- ============================================================================

CREATE OR REPLACE FUNCTION set_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_year INTEGER;
    v_number TEXT;
    v_retry_count INTEGER := 0;
    v_max_retries INTEGER := 10;
    v_next_num INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Only generate if not already set
    IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
        v_year := EXTRACT(YEAR FROM NOW());
        
        -- Use advisory lock to prevent race conditions
        v_lock_key := ('x' || substr(md5(NEW.organization_id::TEXT || v_year::TEXT), 1, 16))::bit(64)::bigint;
        PERFORM pg_advisory_xact_lock(v_lock_key);
        
        -- Get the next sequential number for this org and year
        SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 8) AS INTEGER)), 0) + 1
        INTO v_next_num
        FROM work_orders
        WHERE organization_id = NEW.organization_id
          AND work_order_number LIKE 'WO-' || v_year || '-%';
        
        -- Format: WO-YYYY-NNN
        v_number := 'WO-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
        NEW.work_order_number := v_number;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_work_order_number
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_work_order_number();

-- ============================================================================
-- TRIGGER: UPDATE UPDATED_AT TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_work_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_work_orders_updated_at();

CREATE TRIGGER trigger_update_work_order_assignments_updated_at
    BEFORE UPDATE ON work_order_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_work_orders_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_assignments ENABLE ROW LEVEL SECURITY;

-- Work Orders: SELECT - Users can read work orders from their organization
CREATE POLICY work_orders_select_policy ON work_orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.user_id = auth.uid()
              AND memberships.org_id = work_orders.organization_id
              AND memberships.is_active = true
        )
    );

-- Work Orders: INSERT - Admin/foreman can create work orders
CREATE POLICY work_orders_insert_policy ON work_orders
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.user_id = auth.uid()
              AND memberships.org_id = work_orders.organization_id
              AND memberships.is_active = true
              AND memberships.role IN ('admin', 'foreman')
        )
    );

-- Work Orders: UPDATE - Admin/foreman can update all, workers can update assigned
CREATE POLICY work_orders_update_policy ON work_orders
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = auth.uid()
              AND m.org_id = work_orders.organization_id
              AND m.is_active = true
              AND (
                  m.role IN ('admin', 'foreman')
                  OR EXISTS (
                      SELECT 1 FROM work_order_assignments woa
                      WHERE woa.work_order_id = work_orders.id
                        AND woa.user_id = auth.uid()
                  )
              )
        )
    );

-- Work Orders: DELETE - Admin/foreman can delete
CREATE POLICY work_orders_delete_policy ON work_orders
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.user_id = auth.uid()
              AND memberships.org_id = work_orders.organization_id
              AND memberships.is_active = true
              AND memberships.role IN ('admin', 'foreman')
        )
    );

-- Work Order Assignments: SELECT - Users can read assignments from their organization
CREATE POLICY work_order_assignments_select_policy ON work_order_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM work_orders wo
            JOIN memberships m ON m.org_id = wo.organization_id
            WHERE wo.id = work_order_assignments.work_order_id
              AND m.user_id = auth.uid()
              AND m.is_active = true
        )
    );

-- Work Order Assignments: INSERT - Admin/foreman can create assignments
CREATE POLICY work_order_assignments_insert_policy ON work_order_assignments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM work_orders wo
            JOIN memberships m ON m.org_id = wo.organization_id
            WHERE wo.id = work_order_assignments.work_order_id
              AND m.user_id = auth.uid()
              AND m.is_active = true
              AND m.role IN ('admin', 'foreman')
        )
    );

-- Work Order Assignments: UPDATE - Admin/foreman can update all
CREATE POLICY work_order_assignments_update_policy ON work_order_assignments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM work_orders wo
            JOIN memberships m ON m.org_id = wo.organization_id
            WHERE wo.id = work_order_assignments.work_order_id
              AND m.user_id = auth.uid()
              AND m.is_active = true
              AND m.role IN ('admin', 'foreman')
        )
    );

-- Work Order Assignments: DELETE - Admin/foreman can delete
CREATE POLICY work_order_assignments_delete_policy ON work_order_assignments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM work_orders wo
            JOIN memberships m ON m.org_id = wo.organization_id
            WHERE wo.id = work_order_assignments.work_order_id
              AND m.user_id = auth.uid()
              AND m.is_active = true
              AND m.role IN ('admin', 'foreman')
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE work_orders IS 'Work orders (arbetsorder) - central job card system connecting projects, planning, time tracking, and invoicing';
COMMENT ON COLUMN work_orders.work_order_number IS 'Auto-generated unique number in format WO-YYYY-NNN';
COMMENT ON COLUMN work_orders.external_summary IS 'Summary of completed work for invoice generation ("Vad har utförts?")';
COMMENT ON COLUMN work_orders.signature_blob_url IS 'URL to customer signature blob (stored in Supabase Storage)';
COMMENT ON TABLE work_order_assignments IS 'User assignments to work orders - tracks who is assigned and responsible';

