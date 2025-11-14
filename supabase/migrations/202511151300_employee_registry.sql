-- M2: Employee Registry Foundation
-- Creates employees table for the shared master register
-- Date: 2025-11-15

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_no TEXT NOT NULL,
    
    -- Personal information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    personal_identity_no TEXT,
    email TEXT,
    phone_mobile TEXT,
    phone_work TEXT,
    
    -- Employment details
    employment_type TEXT NOT NULL DEFAULT 'FULL_TIME' CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY')),
    hourly_rate_sek DECIMAL(10, 2),
    employment_start_date DATE,
    employment_end_date DATE,
    
    -- Address
    address_street TEXT,
    address_zip TEXT,
    address_city TEXT,
    address_country TEXT DEFAULT 'Sverige',
    
    -- Additional information
    notes TEXT,
    
    -- Metadata
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT employees_org_employee_no_unique UNIQUE (org_id, employee_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON public.employees(org_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_no ON public.employees(employee_no);
CREATE INDEX IF NOT EXISTS idx_employees_personal_id ON public.employees(personal_identity_no) WHERE personal_identity_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON public.employees(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees(last_name, first_name);

-- Partial unique index for personal identity number (one per organization)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_org_personal_id_unique 
    ON public.employees(org_id, personal_identity_no) 
    WHERE personal_identity_no IS NOT NULL;

-- Partial unique index for email (one per organization)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_org_email_unique 
    ON public.employees(org_id, email) 
    WHERE email IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view employees in their organization
CREATE POLICY "Users can view employees in their organization"
    ON public.employees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.org_id = employees.org_id
            AND m.user_id = auth.uid()
            AND m.is_active = TRUE
        )
    );

-- Policy: Only admins and foremen can insert employees
CREATE POLICY "Admins and foremen can insert employees"
    ON public.employees
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.org_id = employees.org_id
            AND m.user_id = auth.uid()
            AND m.is_active = TRUE
            AND m.role IN ('admin', 'foreman')
        )
    );

-- Policy: Only admins and foremen can update employees
CREATE POLICY "Admins and foremen can update employees"
    ON public.employees
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.org_id = employees.org_id
            AND m.user_id = auth.uid()
            AND m.is_active = TRUE
            AND m.role IN ('admin', 'foreman')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.org_id = employees.org_id
            AND m.user_id = auth.uid()
            AND m.is_active = TRUE
            AND m.role IN ('admin', 'foreman')
        )
    );

-- Policy: Only admins can delete employees (soft delete via is_archived)
CREATE POLICY "Admins can update is_archived"
    ON public.employees
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.org_id = employees.org_id
            AND m.user_id = auth.uid()
            AND m.is_active = TRUE
            AND m.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.org_id = employees.org_id
            AND m.user_id = auth.uid()
            AND m.is_active = TRUE
            AND m.role = 'admin'
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.employees IS 'Employee registry - part of shared master register (customers, employees, subcontractors)';
COMMENT ON COLUMN public.employees.employee_no IS 'Unique employee number within organization (e.g., E-123456)';
COMMENT ON COLUMN public.employees.personal_identity_no IS 'Swedish personal identity number (personnummer)';
COMMENT ON COLUMN public.employees.employment_type IS 'Type of employment: FULL_TIME, PART_TIME, CONTRACTOR, TEMPORARY';
COMMENT ON COLUMN public.employees.hourly_rate_sek IS 'Hourly rate in SEK';
COMMENT ON COLUMN public.employees.is_archived IS 'Soft delete flag - archived employees are not shown in active lists';

