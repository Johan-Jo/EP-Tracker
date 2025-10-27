-- =====================================================
-- FIX: Diary Date Timezone Issue
-- =====================================================
-- Problem: Dates shift by one day due to timezone conversion
-- Solution: Create RPC function that handles DATE type properly

-- Helper function to insert diary entry with proper date handling
CREATE OR REPLACE FUNCTION insert_diary_entry(
  p_org_id uuid,
  p_project_id uuid,
  p_created_by uuid,
  p_date text, -- Accept as text to avoid automatic conversion
  p_weather text DEFAULT NULL,
  p_temperature_c integer DEFAULT NULL,
  p_crew_count integer DEFAULT NULL,
  p_work_performed text DEFAULT NULL,
  p_obstacles text DEFAULT NULL,
  p_safety_notes text DEFAULT NULL,
  p_deliveries text DEFAULT NULL,
  p_visitors text DEFAULT NULL,
  p_signature_name text DEFAULT NULL,
  p_signature_timestamp timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry diary_entries;
BEGIN
  -- Insert with explicit DATE cast to prevent timezone conversion
  INSERT INTO diary_entries (
    org_id,
    project_id,
    created_by,
    date,
    weather,
    temperature_c,
    crew_count,
    work_performed,
    obstacles,
    safety_notes,
    deliveries,
    visitors,
    signature_name,
    signature_timestamp
  ) VALUES (
    p_org_id,
    p_project_id,
    p_created_by,
    p_date::date, -- Explicit cast to DATE (no time component, no timezone)
    p_weather,
    p_temperature_c,
    p_crew_count,
    p_work_performed,
    p_obstacles,
    p_safety_notes,
    p_deliveries,
    p_visitors,
    p_signature_name,
    p_signature_timestamp
  )
  RETURNING * INTO v_entry;

  -- Return as JSON
  RETURN row_to_json(v_entry);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_diary_entry TO authenticated;

-- Add comment
COMMENT ON FUNCTION insert_diary_entry IS 
  'Insert diary entry with proper DATE handling to avoid timezone conversion issues';

