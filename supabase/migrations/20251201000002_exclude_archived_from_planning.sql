-- Migration: Exclude archived projects from planning
-- Description: Update get_planning_data function to exclude archived projects
-- Date: 2025-12-01

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
          AND is_archived = FALSE  -- Exclude archived projects
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
          -- Exclude assignments for archived projects
          AND NOT EXISTS (
              SELECT 1 FROM projects p 
              WHERE p.id = assignments.project_id 
              AND p.is_archived = TRUE
          )
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
    ),
    work_orders_data AS (
        SELECT 
            json_agg(
                json_build_object(
                    'id', wo.id,
                    'work_order_number', wo.work_order_number,
                    'title', wo.title,
                    'project_id', wo.project_id,
                    'organization_id', wo.organization_id,
                    'planned_start_at', wo.planned_start_at,
                    'planned_end_at', wo.planned_end_at,
                    'all_day', wo.all_day,
                    'status', wo.status,
                    'priority', wo.priority,
                    'location_address', wo.location_address,
                    'location_city', wo.location_city,
                    'location_zip', wo.location_zip,
                    'created_at', wo.created_at,
                    'updated_at', wo.updated_at,
                    -- Include assignments for this work order
                    'assignments', (
                        SELECT json_agg(
                            json_build_object(
                                'id', woa.id,
                                'user_id', woa.user_id,
                                'role', woa.role
                            )
                        )
                        FROM work_order_assignments woa
                        WHERE woa.work_order_id = wo.id
                    )
                )
            ) AS data
        FROM work_orders wo
        WHERE wo.organization_id = p_org_id
          AND wo.planned_start_at >= p_week_start
          AND wo.planned_start_at <= p_week_end
          AND wo.status != 'cancelled'
          AND (p_project_id IS NULL OR wo.project_id = p_project_id)
          AND (
              p_user_id_filter IS NULL 
              OR EXISTS (
                  SELECT 1 
                  FROM work_order_assignments woa 
                  WHERE woa.work_order_id = wo.id 
                    AND woa.user_id = p_user_id_filter
              )
          )
          -- Exclude work orders for archived projects
          AND (wo.project_id IS NULL OR NOT EXISTS (
              SELECT 1 FROM projects p 
              WHERE p.id = wo.project_id 
              AND p.is_archived = TRUE
          ))
    )
    SELECT json_build_object(
        'resources', COALESCE((SELECT data FROM resources_data), '[]'::json),
        'projects', COALESCE((SELECT data FROM projects_data), '[]'::json),
        'assignments', COALESCE((SELECT data FROM assignments_data), '[]'::json),
        'absences', COALESCE((SELECT data FROM absences_data), '[]'::json),
        'work_orders', COALESCE((SELECT data FROM work_orders_data), '[]'::json)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION get_planning_data IS 
'EPIC 26.6 + EPIC 52: Optimized planning data fetch - includes assignments, absences, and work orders. Excludes archived projects.';














