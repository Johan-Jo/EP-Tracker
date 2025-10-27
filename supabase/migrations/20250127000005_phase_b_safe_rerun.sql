-- EPIC 26.9 Phase B: Safe Re-run (handles existing objects)
-- This migration can be run multiple times safely

-- =====================================================
-- PART 1: Create Activity Log Table (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Activity details
  type text NOT NULL CHECK (type IN ('time_entry', 'material', 'expense', 'mileage', 'diary', 'ata', 'checklist')),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'completed')),
  description text NOT NULL,
  
  -- Metadata
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  
  -- Soft delete support
  is_deleted boolean DEFAULT false
);

COMMENT ON TABLE activity_log IS 
  'EPIC 26.9: Unified activity log for fast recent activity queries';

-- =====================================================
-- PART 2: Create Indexes (DROP first to avoid conflicts)
-- =====================================================

DROP INDEX IF EXISTS idx_activity_log_org_created;
DROP INDEX IF EXISTS idx_activity_log_user_created;
DROP INDEX IF EXISTS idx_activity_log_project_created;
DROP INDEX IF EXISTS idx_activity_log_type_created;

-- Recreate indexes
CREATE INDEX idx_activity_log_org_created 
  ON activity_log(org_id, created_at DESC) 
  WHERE is_deleted = false;

CREATE INDEX idx_activity_log_user_created 
  ON activity_log(user_id, created_at DESC) 
  WHERE is_deleted = false;

CREATE INDEX idx_activity_log_project_created 
  ON activity_log(project_id, created_at DESC) 
  WHERE is_deleted = false AND project_id IS NOT NULL;

CREATE INDEX idx_activity_log_type_created 
  ON activity_log(type, created_at DESC) 
  WHERE is_deleted = false;

-- =====================================================
-- PART 3: RLS Policies (DROP first)
-- =====================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org activities" ON activity_log;
DROP POLICY IF EXISTS "System can insert activities" ON activity_log;

CREATE POLICY "Users can view org activities"
  ON activity_log FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "System can insert activities"
  ON activity_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- PART 4: Trigger Function (REPLACE)
-- =====================================================

CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
  v_project_id uuid;
  v_description text;
  v_data jsonb;
  v_action text;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
  END IF;

  -- Extract common fields
  v_org_id := COALESCE(NEW.org_id, OLD.org_id);
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);

  -- Build description and data based on table
  CASE TG_TABLE_NAME
    WHEN 'time_entries' THEN
      v_description := 'Tidrapport ' || v_action;
      v_data := jsonb_build_object(
        'duration_min', COALESCE(NEW.duration_min, OLD.duration_min),
        'task_label', COALESCE(NEW.task_label, OLD.task_label)
      );
    
    WHEN 'materials' THEN
      v_description := 'Material: ' || COALESCE(NEW.description, OLD.description);
      v_data := jsonb_build_object(
        'qty', COALESCE(NEW.qty, OLD.qty),
        'unit', COALESCE(NEW.unit, OLD.unit)
      );
    
    WHEN 'expenses' THEN
      v_description := 'Kostnad: ' || COALESCE(NEW.description, OLD.description);
      v_data := jsonb_build_object(
        'amount_sek', COALESCE(NEW.amount_sek, OLD.amount_sek),
        'category', COALESCE(NEW.category, OLD.category)
      );
    
    WHEN 'mileage' THEN
      v_description := 'Milersättning: ' || COALESCE(NEW.from_location, OLD.from_location) || ' → ' || COALESCE(NEW.to_location, OLD.to_location);
      v_data := jsonb_build_object(
        'distance_km', COALESCE(NEW.distance_km, OLD.distance_km),
        'rate', COALESCE(NEW.rate_per_km, OLD.rate_per_km)
      );
    
    WHEN 'diary_entries' THEN
      v_description := 'Dagbok: ' || COALESCE(NEW.title, OLD.title);
      v_data := jsonb_build_object(
        'weather', COALESCE(NEW.weather, OLD.weather),
        'crew_count', COALESCE(NEW.crew_count, OLD.crew_count)
      );
    
    WHEN 'ata' THEN
      v_description := 'ÄTA: ' || COALESCE(NEW.title, OLD.title);
      v_data := jsonb_build_object(
        'estimated_cost', COALESCE(NEW.estimated_cost, OLD.estimated_cost),
        'status', COALESCE(NEW.status, OLD.status)
      );
    
    ELSE
      v_description := TG_TABLE_NAME || ' ' || v_action;
      v_data := '{}'::jsonb;
  END CASE;

  -- Insert activity log
  INSERT INTO activity_log (
    org_id,
    user_id,
    project_id,
    type,
    action,
    description,
    data
  ) VALUES (
    v_org_id,
    v_user_id,
    v_project_id,
    REPLACE(TG_TABLE_NAME, '_entries', '_entry'),
    v_action,
    v_description,
    v_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- PART 5: Attach Triggers (DROP first)
-- =====================================================

DROP TRIGGER IF EXISTS time_entries_activity_log ON time_entries;
CREATE TRIGGER time_entries_activity_log
  AFTER INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS materials_activity_log ON materials;
CREATE TRIGGER materials_activity_log
  AFTER INSERT OR UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS expenses_activity_log ON expenses;
CREATE TRIGGER expenses_activity_log
  AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS mileage_activity_log ON mileage;
CREATE TRIGGER mileage_activity_log
  AFTER INSERT OR UPDATE ON mileage
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS diary_entries_activity_log ON diary_entries;
CREATE TRIGGER diary_entries_activity_log
  AFTER INSERT OR UPDATE ON diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS ata_activity_log ON ata;
CREATE TRIGGER ata_activity_log
  AFTER INSERT OR UPDATE ON ata
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- =====================================================
-- PART 6: Fast Activity Query Function
-- =====================================================

CREATE OR REPLACE FUNCTION get_recent_activities_fast(
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
    al.id,
    al.type,
    al.created_at,
    al.project_id,
    p.name as project_name,
    pr.full_name as user_name,
    al.data,
    al.description
  FROM activity_log al
  LEFT JOIN projects p ON p.id = al.project_id
  LEFT JOIN profiles pr ON pr.id = al.user_id
  WHERE al.org_id = p_org_id
    AND al.is_deleted = false
    AND al.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- PART 7: Backfill (Skip if already done)
-- =====================================================

DO $$
DECLARE
  activity_count int;
BEGIN
  -- Check if backfill already done
  SELECT COUNT(*) INTO activity_count FROM activity_log;
  
  IF activity_count = 0 THEN
    -- Backfill time entries
    INSERT INTO activity_log (org_id, user_id, project_id, type, action, description, data, created_at)
    SELECT 
      te.org_id,
      te.user_id,
      te.project_id,
      'time_entry'::text,
      'created'::text,
      'Tidrapport created',
      jsonb_build_object('duration_min', te.duration_min, 'task_label', te.task_label),
      te.created_at
    FROM time_entries te
    WHERE te.created_at >= CURRENT_DATE - INTERVAL '30 days';

    -- Backfill materials
    INSERT INTO activity_log (org_id, user_id, project_id, type, action, description, data, created_at)
    SELECT 
      m.org_id,
      m.user_id,
      m.project_id,
      'material'::text,
      'created'::text,
      'Material: ' || m.description,
      jsonb_build_object('qty', m.qty, 'unit', m.unit),
      m.created_at
    FROM materials m
    WHERE m.created_at >= CURRENT_DATE - INTERVAL '30 days';

    -- Backfill expenses
    INSERT INTO activity_log (org_id, user_id, project_id, type, action, description, data, created_at)
    SELECT 
      e.org_id,
      e.user_id,
      e.project_id,
      'expense'::text,
      'created'::text,
      'Kostnad: ' || e.description,
      jsonb_build_object('amount_sek', e.amount_sek, 'category', e.category),
      e.created_at
    FROM expenses e
    WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days';

    RAISE NOTICE 'Backfill completed';
  ELSE
    RAISE NOTICE 'Backfill skipped (% activities already exist)', activity_count;
  END IF;
END $$;

-- =====================================================
-- PART 8: Cleanup Function
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM activity_log
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleaned up old activities';
END;
$$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase B migration completed successfully!';
  RAISE NOTICE 'Activity log table: ready';
  RAISE NOTICE 'Triggers: attached to 6 tables';
  RAISE NOTICE 'Function: get_recent_activities_fast() created';
END $$;

