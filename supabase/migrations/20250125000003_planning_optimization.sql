-- EPIC 26.6 - Planning Page Optimization Part 2
-- Consolidate planning queries into database functions for maximum speed

-- Function 1: Get all planning data for a week in one call
-- This replaces 4 separate queries with 1 optimized database-side query
CREATE OR REPLACE FUNCTION get_planning_data(
    p_org_id UUID,
    p_week_start TIMESTAMP WITH TIME ZONE,
    p_week_end TIMESTAMP WITH TIME ZONE,
    p_project_id UUID DEFAULT NULL,
    p_user_id_filter UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Execute all queries in parallel and return as single JSON object
    WITH 
    resources_data AS (
        SELECT 
            json_agg(
                json_build_object(
                    'id', m.user_id,
                    'full_name', p.full_name,
                    'email', p.email,
                    'role', m.role,
                    'is_active', m.is_active
                )
            ) AS data
        FROM memberships m
        INNER JOIN profiles p ON p.id = m.user_id
        WHERE m.org_id = p_org_id
          AND m.is_active = true
    ),
    projects_data AS (
        SELECT 
            json_agg(
                json_build_object(
                    'id', id,
                    'name', name,
                    'project_number', project_number,
                    'client_name', client_name,
                    'color', color,
                    'daily_capacity_need', daily_capacity_need,
                    'status', status,
                    'site_address', site_address
                )
            ) AS data
        FROM projects
        WHERE org_id = p_org_id
          AND status IN ('active', 'paused')
          AND (p_project_id IS NULL OR id = p_project_id)
    ),
    assignments_data AS (
        SELECT 
            json_agg(
                json_build_object(
                    'id', id,
                    'org_id', org_id,
                    'project_id', project_id,
                    'user_id', user_id,
                    'start_ts', start_ts,
                    'end_ts', end_ts,
                    'all_day', all_day,
                    'status', status,
                    'address', address,
                    'created_at', created_at,
                    'updated_at', updated_at
                )
            ) AS data
        FROM assignments
        WHERE org_id = p_org_id
          AND start_ts >= p_week_start
          AND start_ts <= p_week_end
          AND status != 'cancelled'
          AND (p_project_id IS NULL OR project_id = p_project_id)
          AND (p_user_id_filter IS NULL OR user_id = p_user_id_filter)
    ),
    absences_data AS (
        SELECT 
            json_agg(
                json_build_object(
                    'id', id,
                    'org_id', org_id,
                    'user_id', user_id,
                    'start_ts', start_ts,
                    'end_ts', end_ts,
                    'type', type,
                    'note', note,
                    'created_at', created_at,
                    'updated_at', updated_at
                )
            ) AS data
        FROM absences
        WHERE org_id = p_org_id
          AND (
              start_ts <= p_week_end AND end_ts >= p_week_start
          )
          AND (p_user_id_filter IS NULL OR user_id = p_user_id_filter)
    )
    SELECT json_build_object(
        'resources', COALESCE((SELECT data FROM resources_data), '[]'::json),
        'projects', COALESCE((SELECT data FROM projects_data), '[]'::json),
        'assignments', COALESCE((SELECT data FROM assignments_data), '[]'::json),
        'absences', COALESCE((SELECT data FROM absences_data), '[]'::json)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add performance indexes for planning queries
CREATE INDEX IF NOT EXISTS idx_assignments_org_start_status 
    ON assignments(org_id, start_ts, status) 
    WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_assignments_project_user 
    ON assignments(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_absences_org_dates 
    ON absences(org_id, start_ts, end_ts);

CREATE INDEX IF NOT EXISTS idx_absences_user 
    ON absences(user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_org_active 
    ON memberships(org_id, is_active) 
    WHERE is_active = true;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_planning_data(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_planning_data IS 
'EPIC 26.6: Optimized planning data fetch - consolidates 4 queries into 1 database-side query with parallel execution';

