-- EPIC 26: Dashboard Query Optimization
-- Story 26.4: Create database functions to reduce dashboard queries from 12 to 3-4
-- 
-- Created: 2025-10-25
-- Purpose: Optimize dashboard loading by combining multiple queries into efficient functions

-- =====================================================
-- Function 1: Get Dashboard Stats
-- Replaces 4 separate count queries with 1 aggregated query
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_user_id uuid,
  p_org_id uuid,
  p_start_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result json;
  v_start_date timestamptz;
BEGIN
  -- Use provided start date or default to start of current week
  IF p_start_date IS NULL THEN
    v_start_date := date_trunc('week', CURRENT_TIMESTAMP);
  ELSE
    v_start_date := p_start_date;
  END IF;

  SELECT json_build_object(
    'projectsCount', (
      SELECT COUNT(*)
      FROM projects
      WHERE org_id = p_org_id
        AND status = 'active'
    ),
    'timeEntriesCount', (
      SELECT COUNT(*)
      FROM time_entries
      WHERE user_id = p_user_id
        AND start_at >= v_start_date
    ),
    'materialsCount', (
      SELECT 
        (SELECT COUNT(*) FROM materials WHERE user_id = p_user_id AND created_at >= v_start_date) +
        (SELECT COUNT(*) FROM expenses WHERE user_id = p_user_id AND created_at >= v_start_date)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_dashboard_stats IS 'EPIC 26.4: Get aggregated dashboard stats in one query';

-- =====================================================
-- Function 2: Get Recent Activities
-- Combines 6 separate queries into 1 unified query
-- =====================================================

CREATE OR REPLACE FUNCTION get_recent_activities(
  p_org_id uuid,
  p_limit int DEFAULT 15
)
RETURNS TABLE (
  id uuid,
  type text,
  created_at timestamptz,
  project_id uuid,
  project_name text,
  user_name text,
  data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    activity.id,
    activity.type,
    activity.created_at,
    activity.project_id,
    activity.project_name,
    activity.user_name,
    activity.data
  FROM (
    -- Time entries
    SELECT 
      te.id,
      'time'::text as type,
      te.created_at,
      te.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object(
        'start_at', te.start_at,
        'stop_at', te.stop_at
      ) as data
    FROM time_entries te
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN profiles pr ON te.user_id = pr.id
    WHERE te.org_id = p_org_id
    
    UNION ALL
    
    -- Materials
    SELECT 
      m.id,
      'material'::text as type,
      m.created_at,
      m.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object(
        'description', m.description,
        'qty', m.qty,
        'unit', m.unit
      ) as data
    FROM materials m
    LEFT JOIN projects p ON m.project_id = p.id
    LEFT JOIN profiles pr ON m.user_id = pr.id
    WHERE m.org_id = p_org_id
    
    UNION ALL
    
    -- Expenses
    SELECT 
      e.id,
      'expense'::text as type,
      e.created_at,
      e.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object(
        'description', e.description,
        'amount_sek', e.amount_sek
      ) as data
    FROM expenses e
    LEFT JOIN projects p ON e.project_id = p.id
    LEFT JOIN profiles pr ON e.user_id = pr.id
    WHERE e.org_id = p_org_id
    
    UNION ALL
    
    -- ATA
    SELECT 
      a.id,
      'ata'::text as type,
      a.created_at,
      a.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object(
        'title', a.title
      ) as data
    FROM ata a
    LEFT JOIN projects p ON a.project_id = p.id
    LEFT JOIN profiles pr ON a.created_by = pr.id
    WHERE a.org_id = p_org_id
    
    UNION ALL
    
    -- Diary Entries
    SELECT 
      d.id,
      'diary'::text as type,
      d.created_at,
      d.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object(
        'date', d.date,
        'work_performed', d.work_performed
      ) as data
    FROM diary_entries d
    LEFT JOIN projects p ON d.project_id = p.id
    LEFT JOIN profiles pr ON d.created_by = pr.id
    WHERE d.org_id = p_org_id
  ) activity
  ORDER BY activity.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_recent_activities IS 'EPIC 26.4: Get recent activities across all types in one query';

-- =====================================================
-- Indexes for Performance
-- Ensure all queries are fast with proper indexing
-- =====================================================

-- Time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_start 
  ON time_entries(user_id, start_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_org_created 
  ON time_entries(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_org_null_stop
  ON time_entries(org_id, user_id, start_at DESC)
  WHERE stop_at IS NULL;

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_org_status 
  ON projects(org_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_projects_org_created 
  ON projects(org_id, created_at DESC)
  WHERE status = 'active';

-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_user_created 
  ON materials(user_id, created_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_materials_org_created 
  ON materials(org_id, created_at DESC);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_created 
  ON expenses(user_id, created_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_org_created 
  ON expenses(org_id, created_at DESC);

-- ATA indexes
CREATE INDEX IF NOT EXISTS idx_ata_org_created 
  ON ata(org_id, created_at DESC);

-- Diary indexes
CREATE INDEX IF NOT EXISTS idx_diary_entries_org_created 
  ON diary_entries(org_id, created_at DESC);

-- =====================================================
-- Grant Permissions
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activities TO authenticated;

-- =====================================================
-- Testing Queries
-- Run these to verify the functions work correctly
-- =====================================================

-- Test get_dashboard_stats
-- SELECT get_dashboard_stats(
--   auth.uid(),
--   (SELECT org_id FROM memberships WHERE user_id = auth.uid() LIMIT 1),
--   NOW() - INTERVAL '7 days'
-- );

-- Test get_recent_activities
-- SELECT * FROM get_recent_activities(
--   (SELECT org_id FROM memberships WHERE user_id = auth.uid() LIMIT 1),
--   10
-- );

-- =====================================================
-- Migration Complete
-- =====================================================

