-- =============================================================================
-- Diary Entries: One Entry Per User and Project Per Day
-- =============================================================================
-- Requirement: Allow multiple users on the same project to have their own diary
-- entries for the same day. Previously we enforced a unique diary per project
-- per day, which blocked additional users.
--
-- Changes:
--   1. Replace unique constraint (project_id, date) with (project_id, created_by, date)
--   2. Refresh insert_diary_entry RPC to surface user-specific duplicate message
--
-- Safe to run multiple times (IF EXISTS guards).
-- =============================================================================

-- 1. Swap unique constraint
ALTER TABLE IF EXISTS diary_entries
  DROP CONSTRAINT IF EXISTS diary_entries_project_id_date_key;

ALTER TABLE IF EXISTS diary_entries
  ADD CONSTRAINT diary_entries_project_user_date_key
  UNIQUE (project_id, created_by, date);

COMMENT ON CONSTRAINT diary_entries_project_user_date_key ON diary_entries IS
  'Ensure each user can have at most one diary entry per project and date';

-- 2. Refresh insert_diary_entry RPC with updated duplicate handling
CREATE OR REPLACE FUNCTION insert_diary_entry(
  p_org_id uuid,
  p_project_id uuid,
  p_created_by uuid,
  p_date date,
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
    p_date,
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
    RAISE EXCEPTION 'Du har redan skapat en dagbokspost för det här projektet och datumet.'
      USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION insert_diary_entry(uuid, uuid, uuid, date, text, integer, integer, text, text, text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION insert_diary_entry(uuid, uuid, uuid, date, text, integer, integer, text, text, text, text, text, text, timestamptz) TO authenticated;

COMMENT ON FUNCTION insert_diary_entry IS
  'Insert diary entry with DATE parameter and per-user uniqueness enforcement';


