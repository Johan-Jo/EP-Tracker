-- Verify diary date fix migration
-- Run this in Supabase SQL Editor to check if the function exists

-- Check if insert_diary_entry function exists
SELECT 
    routine_name,
    routine_type,
    created
FROM information_schema.routines
WHERE routine_name = 'insert_diary_entry'
AND routine_schema = 'public';

-- If it returns a row, the function exists ✓
-- If it returns empty, you need to run the migration SQL















