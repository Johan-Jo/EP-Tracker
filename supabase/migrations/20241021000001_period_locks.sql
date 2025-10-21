-- Migration: Period Locks
-- Description: Add ability to lock time periods to prevent changes after approval
-- Date: 2025-10-21

-- Create period_locks table
CREATE TABLE IF NOT EXISTS period_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    locked_by UUID NOT NULL REFERENCES profiles(id),
    locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT period_locks_dates_valid CHECK (period_end >= period_start),
    CONSTRAINT period_locks_org_period_unique UNIQUE (org_id, period_start, period_end)
);

-- Add indexes
CREATE INDEX idx_period_locks_org_id ON period_locks(org_id);
CREATE INDEX idx_period_locks_dates ON period_locks(period_start, period_end);
CREATE INDEX idx_period_locks_locked_by ON period_locks(locked_by);

-- Add RLS policies
ALTER TABLE period_locks ENABLE ROW LEVEL SECURITY;

-- Policy: View period locks in own organization
CREATE POLICY "Users can view period locks in own org"
    ON period_locks
    FOR SELECT
    USING (org_id IN (SELECT user_orgs()));

-- Policy: Admin can create period locks
CREATE POLICY "Admin can create period locks"
    ON period_locks
    FOR INSERT
    WITH CHECK (
        org_id IN (SELECT user_orgs())
        AND is_org_admin(org_id)
    );

-- Policy: Admin can delete (unlock) period locks
CREATE POLICY "Admin can delete period locks"
    ON period_locks
    FOR DELETE
    USING (
        org_id IN (SELECT user_orgs())
        AND is_org_admin(org_id)
    );

-- Add trigger for updated_at
CREATE TRIGGER update_period_locks_updated_at
    BEFORE UPDATE ON period_locks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE period_locks IS 'Locked time periods that prevent data changes after approval';

-- Helper function to check if a date is in a locked period
CREATE OR REPLACE FUNCTION is_period_locked(p_org_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM period_locks
        WHERE org_id = p_org_id
        AND p_date BETWEEN period_start AND period_end
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_period_locked IS 'Check if a date falls within a locked period for an organization';

