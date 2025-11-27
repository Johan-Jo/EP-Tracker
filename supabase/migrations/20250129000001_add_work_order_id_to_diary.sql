-- =============================================================================
-- Add work_order_id support to diary entries
-- =============================================================================
-- EPIC 54: Work Orders Integration - Diary entries
-- 
-- Changes:
--   1. Update insert_diary_entry RPC to accept work_order_id parameter
--   2. Add work_order_id to INSERT statement
--
-- Safe to run multiple times (CREATE OR REPLACE).
-- =============================================================================

-- Update insert_diary_entry RPC to include work_order_id
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
  p_signature_timestamp timestamptz DEFAULT NULL,
  p_work_order_id uuid DEFAULT NULL
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
    signature_timestamp,
    work_order_id
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
    p_signature_timestamp,
    p_work_order_id
  )
  RETURNING * INTO v_entry;

  RETURN v_entry;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Du har redan skapat en dagbokspost för det här projektet och datumet.'
      USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION insert_diary_entry(uuid, uuid, uuid, date, text, integer, integer, text, text, text, text, text, text, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION insert_diary_entry(uuid, uuid, uuid, date, text, integer, integer, text, text, text, text, text, text, timestamptz, uuid) TO authenticated;

COMMENT ON FUNCTION insert_diary_entry IS
  'Insert diary entry with DATE parameter, per-user uniqueness enforcement, and optional work_order_id';

