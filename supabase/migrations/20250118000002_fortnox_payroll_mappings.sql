-- Migration: Create fortnox_payroll_mappings tables
-- Description: Tables for mapping EP-Tracker employees and wage types to Fortnox
-- Date: 2025-01-18

-- ============================================================================
-- 1. Employee Mappings Table
-- Maps EP-Tracker person_id to Fortnox EmployeeId
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fortnox_employee_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fortnox_employee_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_fortnox_employee_mappings_org_id ON public.fortnox_employee_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_fortnox_employee_mappings_person_id ON public.fortnox_employee_mappings(person_id);
CREATE INDEX IF NOT EXISTS idx_fortnox_employee_mappings_fortnox_id ON public.fortnox_employee_mappings(fortnox_employee_id);

COMMENT ON TABLE public.fortnox_employee_mappings IS 'Maps EP-Tracker employees (person_id) to Fortnox EmployeeId';
COMMENT ON COLUMN public.fortnox_employee_mappings.fortnox_employee_id IS 'Employee ID in Fortnox Payroll (must exist in Fortnox)';

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_fortnox_employee_mappings_updated_at ON public.fortnox_employee_mappings;
CREATE TRIGGER update_fortnox_employee_mappings_updated_at
    BEFORE UPDATE ON public.fortnox_employee_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Wage Code Mappings Table
-- Maps EP-Tracker wage types to Fortnox SalaryCode
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fortnox_wage_code_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ep_wage_type TEXT NOT NULL,
    fortnox_salary_code TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, ep_wage_type)
);

CREATE INDEX IF NOT EXISTS idx_fortnox_wage_code_mappings_org_id ON public.fortnox_wage_code_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_fortnox_wage_code_mappings_ep_wage_type ON public.fortnox_wage_code_mappings(ep_wage_type);
CREATE INDEX IF NOT EXISTS idx_fortnox_wage_code_mappings_active ON public.fortnox_wage_code_mappings(org_id, is_active) WHERE is_active = TRUE;

COMMENT ON TABLE public.fortnox_wage_code_mappings IS 'Maps EP-Tracker wage types to Fortnox SalaryCode';
COMMENT ON COLUMN public.fortnox_wage_code_mappings.ep_wage_type IS 'EP-Tracker wage type (e.g., "normal", "overtime", "ob")';
COMMENT ON COLUMN public.fortnox_wage_code_mappings.fortnox_salary_code IS 'Fortnox SalaryCode (must exist in Fortnox Payroll)';

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_fortnox_wage_code_mappings_updated_at ON public.fortnox_wage_code_mappings;
CREATE TRIGGER update_fortnox_wage_code_mappings_updated_at
    BEFORE UPDATE ON public.fortnox_wage_code_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Enable RLS and Policies
-- ============================================================================

-- Employee Mappings RLS
ALTER TABLE public.fortnox_employee_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view employee mappings in their org" ON public.fortnox_employee_mappings;
DROP POLICY IF EXISTS "Admins and foremen can manage employee mappings" ON public.fortnox_employee_mappings;

CREATE POLICY "Users can view employee mappings in their org"
    ON public.fortnox_employee_mappings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_employee_mappings.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'finance', 'foreman')
        )
    );

CREATE POLICY "Admins and foremen can manage employee mappings"
    ON public.fortnox_employee_mappings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_employee_mappings.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'foreman')
        )
    );

-- Wage Code Mappings RLS
ALTER TABLE public.fortnox_wage_code_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view wage code mappings in their org" ON public.fortnox_wage_code_mappings;
DROP POLICY IF EXISTS "Admins and foremen can manage wage code mappings" ON public.fortnox_wage_code_mappings;

CREATE POLICY "Users can view wage code mappings in their org"
    ON public.fortnox_wage_code_mappings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_wage_code_mappings.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'finance', 'foreman')
        )
    );

CREATE POLICY "Admins and foremen can manage wage code mappings"
    ON public.fortnox_wage_code_mappings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_wage_code_mappings.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'foreman')
        )
    );

