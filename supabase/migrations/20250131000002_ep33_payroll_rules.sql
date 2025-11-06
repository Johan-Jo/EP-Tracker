-- EPIC 33 Phase 2: Create payroll_rules table for organization-specific payroll configuration
-- This allows each organization to configure their own payroll calculation rules

-- payroll_rules table (one row per organization)
CREATE TABLE IF NOT EXISTS public.payroll_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Overtime rules
    normal_hours_threshold INTEGER NOT NULL DEFAULT 40, -- hours/week for overtime (default 40h/week)
    overtime_multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.5, -- multiplier for overtime hours
    
    -- Break rules
    auto_break_duration INTEGER NOT NULL DEFAULT 30, -- minutes (default 30 min)
    auto_break_after_hours DECIMAL(4, 2) NOT NULL DEFAULT 6.0, -- hours before auto-break (default 6.0h)
    
    -- OB (Overtid/Belöningspengar) rates - stored as JSON for flexibility
    ob_rates JSONB NOT NULL DEFAULT '{
        "night": 1.2,
        "weekend": 1.5,
        "holiday": 2.0
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_rules_org_id ON public.payroll_rules(org_id);

-- Comments
COMMENT ON TABLE public.payroll_rules IS 'Payroll calculation rules per organization';
COMMENT ON COLUMN public.payroll_rules.normal_hours_threshold IS 'Hours per week threshold for overtime calculation (default 40h/week)';
COMMENT ON COLUMN public.payroll_rules.overtime_multiplier IS 'Multiplier for overtime hours (default 1.5)';
COMMENT ON COLUMN public.payroll_rules.auto_break_duration IS 'Automatic break duration in minutes (default 30 min)';
COMMENT ON COLUMN public.payroll_rules.auto_break_after_hours IS 'Hours worked before auto-break is applied (default 6.0h)';
COMMENT ON COLUMN public.payroll_rules.ob_rates IS 'OB rates as JSON: {night: 1.2, weekend: 1.5, holiday: 2.0}';

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_payroll_rules_updated_at ON public.payroll_rules;
CREATE TRIGGER update_payroll_rules_updated_at
    BEFORE UPDATE ON public.payroll_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.payroll_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view payroll rules in their org
DROP POLICY IF EXISTS "Users can view payroll rules in their org" ON public.payroll_rules;
CREATE POLICY "Users can view payroll rules in their org"
    ON public.payroll_rules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.org_id = payroll_rules.org_id
            AND memberships.user_id = auth.uid()
            AND memberships.is_active = TRUE
        )
    );

-- Only admins can manage payroll rules
DROP POLICY IF EXISTS "Admins can manage payroll rules" ON public.payroll_rules;
CREATE POLICY "Admins can manage payroll rules"
    ON public.payroll_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.org_id = payroll_rules.org_id
            AND memberships.user_id = auth.uid()
            AND memberships.is_active = TRUE
            AND memberships.role = 'admin'
        )
    );

-- Function to get or create default payroll rules for an organization
CREATE OR REPLACE FUNCTION get_payroll_rules(p_org_id UUID)
RETURNS public.payroll_rules AS $$
DECLARE
    v_rules public.payroll_rules;
BEGIN
    -- Try to get existing rules
    SELECT * INTO v_rules
    FROM public.payroll_rules
    WHERE org_id = p_org_id;
    
    -- If no rules exist, return default values (not inserting automatically)
    -- This allows API to handle creation explicitly
    IF v_rules IS NULL THEN
        -- Return a row with default values (we'll create via API)
        SELECT 
            gen_random_uuid(),
            p_org_id,
            40, -- normal_hours_threshold
            1.5, -- overtime_multiplier
            30, -- auto_break_duration
            6.0, -- auto_break_after_hours
            '{"night": 1.2, "weekend": 1.5, "holiday": 2.0}'::jsonb,
            NOW(),
            NOW()
        INTO v_rules;
    END IF;
    
    RETURN v_rules;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_payroll_rules IS 'Get payroll rules for an organization, returns defaults if not configured';

