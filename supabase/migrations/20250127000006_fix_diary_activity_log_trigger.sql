-- =====================================================
-- FIX: Activity Log Trigger for diary_entries
-- =====================================================
-- Problem: diary_entries uses 'created_by' not 'user_id'
-- Solution: Handle diary_entries specially in log_activity()

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

  -- Extract common fields (works for NEW or OLD)
  v_org_id := COALESCE(NEW.org_id, OLD.org_id);
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  
  -- FIX: Handle tables using created_by instead of user_id
  IF TG_TABLE_NAME IN ('diary_entries', 'ata') THEN
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
  ELSE
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  END IF;

  -- Build description and data based on table
  CASE TG_TABLE_NAME
    WHEN 'time_entries' THEN
      v_description := 'Tidrapport ' || v_action;
      v_data := jsonb_build_object(
        'duration_min', COALESCE(NEW.duration_min, OLD.duration_min),
        'task_label', COALESCE(NEW.task_label, OLD.task_label),
        'start_at', COALESCE(NEW.start_at, OLD.start_at),
        'stop_at', COALESCE(NEW.stop_at, OLD.stop_at)
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
      v_description := 'Dagbok: ' || COALESCE(TO_CHAR(NEW.date, 'YYYY-MM-DD'), TO_CHAR(OLD.date, 'YYYY-MM-DD'));
      v_data := jsonb_build_object(
        'date', COALESCE(NEW.date, OLD.date),
        'weather', COALESCE(NEW.weather, OLD.weather),
        'crew_count', COALESCE(NEW.crew_count, OLD.crew_count),
        'work_performed', COALESCE(NEW.work_performed, OLD.work_performed)
      );
    
    WHEN 'ata' THEN
      v_description := 'ÄTA: ' || COALESCE(NEW.title, OLD.title);
      v_data := jsonb_build_object(
        'title', COALESCE(NEW.title, OLD.title),
        'qty', COALESCE(NEW.qty, OLD.qty),
        'unit', COALESCE(NEW.unit, OLD.unit),
        'unit_price_sek', COALESCE(NEW.unit_price_sek, OLD.unit_price_sek),
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
    CASE TG_TABLE_NAME
      WHEN 'diary_entries' THEN 'diary'
      WHEN 'time_entries' THEN 'time_entry'
      WHEN 'materials' THEN 'material'
      WHEN 'expenses' THEN 'expense'
      ELSE TG_TABLE_NAME
    END,
    v_action,
    v_description,
    v_data
  );

  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Verify the function was updated
SELECT 'log_activity() function updated successfully' AS status;
