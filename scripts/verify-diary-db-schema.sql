-- STEP A: Verify DB stores correct date
-- Run in Supabase SQL Editor

-- 1) Check column type (must be DATE, not timestamp)
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'diary_entries' AND column_name = 'date';

-- Expected: data_type = 'date'

-- 2) See latest rows and how Postgres sees the date
SELECT 
    id, 
    project_id, 
    date::text AS date_text,  -- Cast to text to see exact value
    created_at,
    signature_timestamp
FROM diary_entries
ORDER BY created_at DESC
LIMIT 10;

-- If date_text shows '2025-10-27' but UI shows 26, problem is in frontend formatting
-- If date_text shows '2025-10-26', problem is in backend (RPC not called or wrong param type)

-- 3) Check if insert_diary_entry RPC exists with DATE parameter
SELECT 
    routine_name,
    routine_type,
    data_type AS return_type,
    external_language
FROM information_schema.routines
WHERE routine_name = 'insert_diary_entry'
AND routine_schema = 'public';

-- Should return 1 row with routine_type = 'FUNCTION'

-- 4) Check RPC parameters
SELECT 
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_name = (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'insert_diary_entry' 
    AND routine_schema = 'public'
)
ORDER BY ordinal_position;

-- p_date should show data_type = 'date' (not text, not timestamp)

