-- ============================================================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- ============================================================================
-- This migration adds compound indexes and optimizes queries for better performance
-- Focuses on the project summary endpoint which makes multiple queries

-- ============================================================================
-- 1. COMPOUND INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- time_entries: Frequently filtered by project_id and grouped by user_id
CREATE INDEX IF NOT EXISTS idx_time_entries_project_user 
ON time_entries(project_id, user_id) 
WHERE status != 'rejected';

-- time_entries: Frequently filtered by project_id and grouped by phase_id
CREATE INDEX IF NOT EXISTS idx_time_entries_project_phase 
ON time_entries(project_id, phase_id) 
WHERE status != 'rejected';

-- time_entries: Missing phase_id index for joins
CREATE INDEX IF NOT EXISTS idx_time_entries_phase_id 
ON time_entries(phase_id);

-- memberships: Frequently filtered by org_id and looked up by user_id
CREATE INDEX IF NOT EXISTS idx_memberships_org_user 
ON memberships(org_id, user_id) 
WHERE is_active = true;

-- materials: Often filtered by project and status
CREATE INDEX IF NOT EXISTS idx_materials_project_status 
ON materials(project_id, status);

-- expenses: Often filtered by project and status
CREATE INDEX IF NOT EXISTS idx_expenses_project_status 
ON expenses(project_id, status);

-- mileage: Often filtered by project and status
CREATE INDEX IF NOT EXISTS idx_mileage_project_status 
ON mileage(project_id, status);

-- project_members: Speed up joins with profiles
CREATE INDEX IF NOT EXISTS idx_project_members_user_project 
ON project_members(user_id, project_id);

-- ============================================================================
-- 2. AGGREGATE FUNCTIONS FOR PROJECT STATISTICS
-- ============================================================================
-- These functions pre-aggregate data in the database instead of in JavaScript

-- Function to get project time statistics efficiently
CREATE OR REPLACE FUNCTION get_project_time_stats(p_project_id UUID)
RETURNS TABLE (
    total_minutes NUMERIC,
    total_hours NUMERIC,
    user_id UUID,
    user_name TEXT,
    user_hours NUMERIC,
    phase_id UUID,
    phase_hours NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH time_totals AS (
        SELECT 
            te.user_id,
            COALESCE(p.full_name, 'Okänd') as user_name,
            te.phase_id,
            SUM(te.duration_min) as minutes
        FROM time_entries te
        LEFT JOIN profiles p ON te.user_id = p.id
        WHERE te.project_id = p_project_id
        AND te.status != 'rejected'
        GROUP BY te.user_id, p.full_name, te.phase_id
    )
    SELECT 
        SUM(minutes) as total_minutes,
        ROUND(SUM(minutes) / 60.0, 1) as total_hours,
        user_id,
        user_name,
        ROUND(SUM(minutes) / 60.0, 1) as user_hours,
        phase_id,
        ROUND(minutes / 60.0, 1) as phase_hours
    FROM time_totals
    GROUP BY GROUPING SETS (
        (), -- Total
        (user_id, user_name), -- By user
        (phase_id) -- By phase
    );
END;
$$;

-- Function to get project cost statistics efficiently
CREATE OR REPLACE FUNCTION get_project_cost_stats(p_project_id UUID)
RETURNS TABLE (
    materials_cost NUMERIC,
    materials_count BIGINT,
    expenses_cost NUMERIC,
    mileage_cost NUMERIC,
    total_cost NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(
            (SELECT SUM(total_sek) FROM materials WHERE project_id = p_project_id AND status != 'rejected'),
            0
        ) as materials_cost,
        COALESCE(
            (SELECT COUNT(*) FROM materials WHERE project_id = p_project_id AND status != 'rejected'),
            0
        ) as materials_count,
        COALESCE(
            (SELECT SUM(amount) FROM expenses WHERE project_id = p_project_id AND status != 'rejected'),
            0
        ) as expenses_cost,
        COALESCE(
            (SELECT SUM(distance_km * rate_per_km) FROM mileage WHERE project_id = p_project_id AND status != 'rejected'),
            0
        ) as mileage_cost,
        COALESCE(
            (SELECT SUM(total_sek) FROM materials WHERE project_id = p_project_id AND status != 'rejected'),
            0
        ) +
        COALESCE(
            (SELECT SUM(amount) FROM expenses WHERE project_id = p_project_id AND status != 'rejected'),
            0
        ) +
        COALESCE(
            (SELECT SUM(distance_km * rate_per_km) FROM mileage WHERE project_id = p_project_id AND status != 'rejected'),
            0
        ) as total_cost;
END;
$$;

-- ============================================================================
-- 3. OPTIMIZE EXISTING INDEXES
-- ============================================================================

-- Add partial indexes for commonly queried statuses
CREATE INDEX IF NOT EXISTS idx_time_entries_active 
ON time_entries(project_id, created_at) 
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_materials_active 
ON materials(project_id, created_at) 
WHERE status = 'approved';

-- ============================================================================
-- 4. ANALYZE TABLES
-- ============================================================================
-- Update table statistics for query planner

ANALYZE time_entries;
ANALYZE materials;
ANALYZE expenses;
ANALYZE mileage;
ANALYZE project_members;
ANALYZE memberships;
ANALYZE phases;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_project_time_stats IS 'Efficiently aggregates time entry statistics for a project';
COMMENT ON FUNCTION get_project_cost_stats IS 'Efficiently aggregates cost statistics (materials, expenses, mileage) for a project';

COMMENT ON INDEX idx_time_entries_project_user IS 'Optimizes queries grouping time entries by user within a project';
COMMENT ON INDEX idx_time_entries_project_phase IS 'Optimizes queries grouping time entries by phase within a project';
COMMENT ON INDEX idx_memberships_org_user IS 'Optimizes user membership lookups within an organization';
COMMENT ON INDEX idx_materials_project_status IS 'Optimizes material queries filtered by project and status';


