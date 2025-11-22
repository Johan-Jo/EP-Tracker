-- Check if projects exist and their status
-- This helps diagnose RLS or visibility issues

SELECT 
    id,
    name,
    project_number,
    org_id,
    status,
    created_at,
    'EXISTS' as visibility
FROM projects 
WHERE id IN (
    '3d184af9-8d14-4091-bf8e-7fca33228542',  -- Keep project
    '1e20ebb5-7efc-4261-b093-a128cad40956'   -- Duplicate project
)
ORDER BY created_at;

-- If no rows returned, the projects may be:
-- 1. Already deleted
-- 2. Filtered by RLS policies (try with service role key)
-- 3. In a different organization

-- Check if there are any projects with similar names
SELECT 
    id,
    name,
    project_number,
    org_id,
    status,
    created_at
FROM projects 
WHERE name ILIKE '%Zippens%'
ORDER BY created_at;


