-- Verify payroll_basis table exists and structure
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_name = 'payroll_basis'
AND table_schema = 'public';

-- 2. Check table structure (columns)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payroll_basis'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'payroll_basis'
AND schemaname = 'public';

-- 4. Check constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.payroll_basis'::regclass;

-- 5. Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'payroll_basis'
AND schemaname = 'public';

-- 6. Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payroll_basis'
AND event_object_schema = 'public';

-- 7. Count rows (should be 0 for now)
SELECT COUNT(*) as total_rows FROM public.payroll_basis;

-- 8. Test query (should return empty but no errors)
SELECT 
    id,
    org_id,
    person_id,
    period_start,
    period_end,
    hours_norm,
    hours_overtime,
    ob_hours,
    break_hours,
    total_hours,
    locked,
    created_at
FROM public.payroll_basis
LIMIT 10;

