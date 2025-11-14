-- Manual backfill script for time_entries
-- Run this directly in Supabase SQL Editor (has higher timeout)
-- Date: 2025-11-15

-- Step 1: Create indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_org_null_links 
    ON public.time_entries(user_id, org_id) 
    WHERE employee_id IS NULL AND subcontractor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_user_org_active 
    ON public.employees(user_id, org_id) 
    WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_subcontractors_user_org_active 
    ON public.subcontractors(user_id, org_id) 
    WHERE is_archived = FALSE;

-- Step 2: Link to employees (run this first)
UPDATE public.time_entries te
SET employee_id = e.id
FROM public.employees e
WHERE te.user_id = e.user_id
    AND te.org_id = e.org_id
    AND e.is_archived = FALSE
    AND te.employee_id IS NULL
    AND te.subcontractor_id IS NULL;

-- Check how many were updated
SELECT COUNT(*) as employees_linked
FROM public.time_entries 
WHERE employee_id IS NOT NULL;

-- Step 3: Link to subcontractors (run this second)
UPDATE public.time_entries te
SET subcontractor_id = s.id
FROM public.subcontractors s
WHERE te.user_id = s.user_id
    AND te.org_id = s.org_id
    AND s.is_archived = FALSE
    AND te.subcontractor_id IS NULL
    AND te.employee_id IS NULL;

-- Final check
SELECT 
    (SELECT COUNT(*) FROM public.time_entries WHERE employee_id IS NOT NULL) as linked_to_employees,
    (SELECT COUNT(*) FROM public.time_entries WHERE subcontractor_id IS NOT NULL) as linked_to_subcontractors,
    (SELECT COUNT(*) FROM public.time_entries WHERE employee_id IS NULL AND subcontractor_id IS NULL) as still_unlinked;

