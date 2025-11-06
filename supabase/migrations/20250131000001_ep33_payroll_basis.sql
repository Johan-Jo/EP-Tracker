-- EPIC 33: Create payroll_basis table for payroll calculations and locking
-- Phase 1: M3a - View löneunderlag (read-only, sums from attendance_session/time_entries)

-- payroll_basis table
CREATE TABLE IF NOT EXISTS public.payroll_basis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Calculated hours
    hours_norm DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Regular hours (up to threshold)
    hours_overtime DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Overtime hours (above threshold)
    ob_hours DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Night/weekend/holiday hours
    break_hours DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Auto-breaks + manual breaks
    total_hours DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Net hours after breaks
    
    -- Corrections (JSON for flexibility)
    corrections_json JSONB DEFAULT '{}'::jsonb,
    
    -- Locking
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by UUID REFERENCES profiles(id),
    locked_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per person per period
    CONSTRAINT unique_person_period UNIQUE (org_id, person_id, period_start, period_end),
    CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_basis_org_id ON public.payroll_basis(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_basis_person_id ON public.payroll_basis(person_id);
CREATE INDEX IF NOT EXISTS idx_payroll_basis_period ON public.payroll_basis(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_basis_locked ON public.payroll_basis(locked) WHERE locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_payroll_basis_org_period ON public.payroll_basis(org_id, period_start, period_end);

-- Add comments
COMMENT ON TABLE public.payroll_basis IS 'Payroll basis calculations per person per period';
COMMENT ON COLUMN public.payroll_basis.hours_norm IS 'Regular hours (up to threshold, typically 40h/week)';
COMMENT ON COLUMN public.payroll_basis.hours_overtime IS 'Overtime hours (above threshold)';
COMMENT ON COLUMN public.payroll_basis.ob_hours IS 'OB (overtid) hours: night/weekend/holiday hours';
COMMENT ON COLUMN public.payroll_basis.break_hours IS 'Total break hours (auto + manual)';
COMMENT ON COLUMN public.payroll_basis.total_hours IS 'Net hours after breaks';
COMMENT ON COLUMN public.payroll_basis.corrections_json IS 'Manual corrections applied to calculations';
COMMENT ON COLUMN public.payroll_basis.locked IS 'Prevents further changes and allows export';
COMMENT ON COLUMN public.payroll_basis.locked_by IS 'User who locked the payroll basis';
COMMENT ON COLUMN public.payroll_basis.locked_at IS 'When the payroll basis was locked';

-- Updated_at trigger (function already exists from initial schema)
DROP TRIGGER IF EXISTS update_payroll_basis_updated_at ON public.payroll_basis;
CREATE TRIGGER update_payroll_basis_updated_at
    BEFORE UPDATE ON public.payroll_basis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.payroll_basis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view payroll basis in their org" ON public.payroll_basis;
DROP POLICY IF EXISTS "Admins and foremen can manage payroll basis" ON public.payroll_basis;

-- Users can view payroll basis for their own org
CREATE POLICY "Users can view payroll basis in their org"
    ON public.payroll_basis
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.org_id = payroll_basis.org_id
            AND memberships.user_id = auth.uid()
            AND memberships.is_active = TRUE
        )
    );

-- Only admins and foremen can insert/update payroll basis
CREATE POLICY "Admins and foremen can manage payroll basis"
    ON public.payroll_basis
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.org_id = payroll_basis.org_id
            AND memberships.user_id = auth.uid()
            AND memberships.is_active = TRUE
            AND memberships.role IN ('admin', 'foreman')
        )
    );

-- Only admins can lock/unlock (superadmin can unlock)
-- Lock policy will be handled in API layer for finer control

