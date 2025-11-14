-- Delete all time entries for user: oi@johan.com.br
-- WARNING: This is a destructive operation!
-- Date: 2025-11-15

-- Step 1: First, check what will be deleted (RUN THIS FIRST!)
SELECT 
    te.id,
    te.start_at,
    te.stop_at,
    te.duration_min,
    te.status,
    te.task_label,
    p.name as project_name,
    COUNT(*) OVER() as total_entries
FROM public.time_entries te
LEFT JOIN public.projects p ON p.id = te.project_id
INNER JOIN public.profiles pr ON pr.id = te.user_id
WHERE pr.email = 'oi@johan.com.br'
ORDER BY te.start_at DESC;

-- Step 2: If you're sure, run this to delete all time entries for this user
-- WARNING: This cannot be undone!
/*
DELETE FROM public.time_entries
WHERE user_id IN (
    SELECT id FROM public.profiles WHERE email = 'oi@johan.com.br'
);
*/

-- Step 3: Verify deletion (should return 0 rows)
SELECT COUNT(*) as remaining_entries
FROM public.time_entries te
INNER JOIN public.profiles pr ON pr.id = te.user_id
WHERE pr.email = 'oi@johan.com.br';

