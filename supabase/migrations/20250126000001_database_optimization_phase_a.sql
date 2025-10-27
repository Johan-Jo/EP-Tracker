-- EPIC 26.9 Phase A: Database Optimization - Quick Wins
-- Story 26.9: Improve database performance with better indexes
-- 
-- Created: 2025-10-26
-- Purpose: Add partial and covering indexes for faster queries
-- Expected Impact: TTFB 1.05s → 0.7s (-33%)

-- =====================================================
-- PART 1: Partial Indexes for Filtered Queries
-- =====================================================

-- Index for active projects count (used in get_dashboard_stats)
-- Partial index only includes active projects = faster & smaller
CREATE INDEX IF NOT EXISTS idx_projects_org_status_active 
  ON projects(org_id, status) 
  WHERE status = 'active';

COMMENT ON INDEX idx_projects_org_status_active IS 
  'EPIC 26.9: Partial index for active projects count';

-- Index for recent time entries (last 30 days)
-- Most dashboard queries only look at recent data
CREATE INDEX IF NOT EXISTS idx_time_entries_recent 
  ON time_entries(user_id, start_at DESC)
  WHERE start_at >= (CURRENT_DATE - INTERVAL '30 days');

COMMENT ON INDEX idx_time_entries_recent IS 
  'EPIC 26.9: Partial index for recent time entries';

-- Index for recent materials (last 30 days)
CREATE INDEX IF NOT EXISTS idx_materials_recent 
  ON materials(user_id, created_at DESC)
  WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

COMMENT ON INDEX idx_materials_recent IS 
  'EPIC 26.9: Partial index for recent materials';

-- Index for recent expenses (last 30 days)
CREATE INDEX IF NOT EXISTS idx_expenses_recent 
  ON expenses(user_id, created_at DESC)
  WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');

COMMENT ON INDEX idx_expenses_recent IS 
  'EPIC 26.9: Partial index for recent expenses';

-- =====================================================
-- PART 2: Covering Indexes (Include columns)
-- =====================================================

-- Covering index for materials (includes data columns)
-- Allows index-only scans = no table lookup needed
CREATE INDEX IF NOT EXISTS idx_materials_org_created_cover 
  ON materials(org_id, created_at DESC) 
  INCLUDE (id, material_name, quantity, unit, user_id);

COMMENT ON INDEX idx_materials_org_created_cover IS 
  'EPIC 26.9: Covering index for materials with included columns';

-- Covering index for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_org_created_cover 
  ON expenses(org_id, created_at DESC) 
  INCLUDE (id, description, amount, category, user_id);

COMMENT ON INDEX idx_expenses_org_created_cover IS 
  'EPIC 26.9: Covering index for expenses with included columns';

-- Covering index for time entries (for activity queries)
CREATE INDEX IF NOT EXISTS idx_time_entries_org_created_cover 
  ON time_entries(org_id, created_at DESC) 
  INCLUDE (id, user_id, project_id, hours, description);

COMMENT ON INDEX idx_time_entries_org_created_cover IS 
  'EPIC 26.9: Covering index for time entries with included columns';

-- =====================================================
-- PART 3: Composite Indexes for Common Filters
-- =====================================================

-- Multi-column index for project + user queries
CREATE INDEX IF NOT EXISTS idx_time_entries_project_user_date 
  ON time_entries(project_id, user_id, start_at DESC);

COMMENT ON INDEX idx_time_entries_project_user_date IS 
  'EPIC 26.9: Composite index for project + user time queries';

-- Multi-column index for org + status + date
CREATE INDEX IF NOT EXISTS idx_projects_org_status_created 
  ON projects(org_id, status, created_at DESC);

COMMENT ON INDEX idx_projects_org_status_created IS 
  'EPIC 26.9: Composite index for project filtering';

-- =====================================================
-- PART 4: Optimize get_dashboard_stats Function
-- =====================================================

-- Update function to limit date range (improves COUNT performance)
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
  -- Use provided start date or default to 30 days ago (not entire history!)
  IF p_start_date IS NULL THEN
    v_start_date := CURRENT_DATE - INTERVAL '30 days';
  ELSE
    v_start_date := p_start_date;
  END IF;

  SELECT json_build_object(
    'active_projects', (
      -- Use partial index
      SELECT COUNT(*)
      FROM projects
      WHERE org_id = p_org_id
        AND status = 'active'
    ),
    'total_hours_week', (
      -- Sum hours instead of count
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE user_id = p_user_id
        AND start_at >= v_start_date
    ),
    'total_materials_week', (
      -- Count only recent (uses partial index)
      SELECT COUNT(*)
      FROM materials
      WHERE user_id = p_user_id
        AND created_at >= v_start_date
    ),
    'total_time_entries_week', (
      -- Count only recent (uses partial index)
      SELECT COUNT(*)
      FROM time_entries
      WHERE user_id = p_user_id
        AND start_at >= v_start_date
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_stats IS 
  'EPIC 26.9: Optimized dashboard stats with limited date range';

-- =====================================================
-- PART 5: Optimize get_recent_activities Function
-- =====================================================

-- Limit to last 7 days instead of all time
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
  data jsonb,
  description text
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
    activity.data,
    activity.description
  FROM (
    -- Time entries (last 7 days only)
    SELECT 
      te.id,
      'time_entry'::text as type,
      te.created_at,
      te.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object('hours', te.hours) as data,
      COALESCE(te.description, 'Tidrapport') as description
    FROM time_entries te
    INNER JOIN profiles pr ON pr.id = te.user_id
    LEFT JOIN projects p ON p.id = te.project_id
    WHERE te.org_id = p_org_id
      AND te.created_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    -- Materials (last 7 days only)
    SELECT 
      m.id,
      'material'::text as type,
      m.created_at,
      m.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object('quantity', m.quantity, 'unit', m.unit) as data,
      m.material_name as description
    FROM materials m
    INNER JOIN profiles pr ON pr.id = m.user_id
    LEFT JOIN projects p ON p.id = m.project_id
    WHERE m.org_id = p_org_id
      AND m.created_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    -- Expenses (last 7 days only)
    SELECT 
      e.id,
      'expense'::text as type,
      e.created_at,
      e.project_id,
      p.name as project_name,
      pr.full_name as user_name,
      jsonb_build_object('amount', e.amount, 'category', e.category) as data,
      e.description
    FROM expenses e
    INNER JOIN profiles pr ON pr.id = e.user_id
    LEFT JOIN projects p ON p.id = e.project_id
    WHERE e.org_id = p_org_id
      AND e.created_at >= CURRENT_DATE - INTERVAL '7 days'
  ) activity
  ORDER BY activity.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_recent_activities IS 
  'EPIC 26.9: Optimized activities limited to last 7 days';

-- =====================================================
-- PART 6: Add Statistics for Query Planner
-- =====================================================

-- Update table statistics for better query planning
ANALYZE projects;
ANALYZE time_entries;
ANALYZE materials;
ANALYZE expenses;
ANALYZE memberships;
ANALYZE profiles;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE '%epic%26%'
ORDER BY tablename, indexname;

-- Check index sizes
SELECT 
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE '%recent%' 
  OR indexrelname LIKE '%cover%'
ORDER BY pg_relation_size(indexrelid) DESC;

