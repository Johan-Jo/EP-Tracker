-- =====================================================
-- FIX: Diary Date Timezone Issue - PROPER SOLUTION
-- =====================================================
-- Problem: Date timezone conversion causes wrong dates
-- Solution: RPC with typed DATE parameter (no conversion)

-- 1. Ensure diary_entries.date column is DATE type
ALTER TABLE IF EXISTS diary_entries
  ALTER COLUMN date TYPE date
  USING date::date;

-- 2. Unique constraint already exists (project_id, date) - verify it's correct
-- The constraint diary_entries_project_id_date_key already exists from initial schema

-- 3. Drop old RPC if it exists (from previous attempt)
DROP FUNCTION IF EXISTS insert_diary_entry(uuid, uuid, uuid, text, text, integer, integer, text, text, text, text, text, text, timestamptz);

-- 4. Create RPC function with DATE parameter (critical!)
CREATE OR REPLACE FUNCTION insert_diary_entry(
  p_org_id uuid,
  p_project_id uuid,
  p_created_by uuid,
  p_date date,              -- << Typed DATE parameter (prevents tz conversion)
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
RETURNS diary_entries
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry diary_entries;
BEGIN
  -- Insert with typed DATE - no timezone conversion
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
    p_date,  -- DATE parameter, no cast needed
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
  
  RETURN v_entry;
EXCEPTION
  WHEN unique_violation THEN
    -- Surface exact Swedish message to user
    RAISE EXCEPTION 'Det finns redan en dagbokspost för detta projekt och datum. Redigera den befintliga posten eller välj ett annat datum.'
      USING ERRCODE = '23505';
END;
$$;

-- 5. Grant execute to authenticated users
REVOKE ALL ON FUNCTION insert_diary_entry FROM public;
GRANT EXECUTE ON FUNCTION insert_diary_entry(uuid, uuid, uuid, date, text, integer, integer, text, text, text, text, text, text, timestamptz) TO authenticated;

-- 6. Comment
COMMENT ON FUNCTION insert_diary_entry IS 
  'Insert diary entry with DATE parameter to prevent timezone conversion';

-- Verify
SELECT 'insert_diary_entry function created successfully' AS status;

