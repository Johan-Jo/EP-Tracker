-- =====================================================
-- VERIFY: Diary Schema and Date Handling
-- =====================================================
-- Run in Supabase SQL Editor to verify diary_entries.date is correct type

-- 1) Check column type (must be 'date', not 'timestamp' or 'timestamptz')
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'diary_entries' 
AND column_name = 'date';

-- 2) Check recent entries - date should be YYYY-MM-DD without time
SELECT 
    id, 
    project_id,
    date::text as date_text,
    created_at
FROM diary_entries
ORDER BY created_at DESC
LIMIT 10;

-- 3) Verify RPC function exists
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'insert_diary_entry';

