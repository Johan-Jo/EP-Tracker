-- Test RLS policy for robinmyhr@gmail.com
-- This script tests if can_access_project() function works correctly

-- ============================================================================
-- STEP 1: Verify user is foreman
-- ============================================================================
SELECT 
    p.id as user_id,
    p.email,
    m.role,
    m.org_id,
    CASE 
        WHEN m.role IN ('admin', 'foreman') THEN TRUE
        ELSE FALSE
    END as should_see_all_projects
FROM profiles p
JOIN memberships m ON p.id = m.user_id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- ============================================================================
-- STEP 2: Test can_access_project() function for each project
-- ============================================================================
-- This simulates what RLS policy does when querying projects
WITH user_info AS (
    SELECT 
        p.id as user_id,
        m.role,
        m.org_id
    FROM profiles p
    JOIN memberships m ON p.id = m.user_id
    WHERE p.email = 'robinmyhr@gmail.com'
    AND m.is_active = TRUE
    LIMIT 1
)
SELECT 
    pr.id,
    pr.name,
    pr.status,
    pr.is_archived,
    ui.role,
    -- Test if is_foreman_or_admin() would return TRUE
    CASE 
        WHEN ui.role IN ('admin', 'foreman') THEN TRUE
        ELSE FALSE
    END as is_foreman_or_admin_result,
    -- Test if can_access_project() would return TRUE
    CASE 
        WHEN ui.role IN ('admin', 'foreman') THEN TRUE
        WHEN EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = pr.id 
            AND pm.user_id = ui.user_id
        ) THEN TRUE
        ELSE FALSE
    END as can_access_project_result,
    -- Check if user is in project_members (shouldn't matter for foreman)
    EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = pr.id 
        AND pm.user_id = ui.user_id
    ) as is_in_project_members
FROM projects pr
CROSS JOIN user_info ui
WHERE pr.org_id = ui.org_id
AND pr.status = 'active'
AND pr.is_archived = false
ORDER BY pr.name;

-- ============================================================================
-- STEP 3: Test actual RLS policy by querying projects as the user
-- ============================================================================
-- This must be run while logged in as robinmyhr@gmail.com
-- The RLS policy will automatically filter based on can_access_project()

SELECT 
    id,
    name,
    status,
    is_archived
FROM projects
WHERE org_id = (
    SELECT m.org_id 
    FROM memberships m
    JOIN profiles p ON m.user_id = p.id
    WHERE p.email = 'robinmyhr@gmail.com'
    AND m.is_active = TRUE
    LIMIT 1
)
AND status = 'active'
AND is_archived = false
ORDER BY name;

-- This should return ALL 16 projects if RLS is working correctly
-- If it only returns 4, there's a problem with the RLS policy

-- ============================================================================
-- STEP 4: Check if user is in project_members (shouldn't affect foreman)
-- ============================================================================
SELECT 
    pm.project_id,
    p.name as project_name,
    COUNT(*) as assignment_count
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = (
    SELECT pr.id 
    FROM profiles pr
    WHERE pr.email = 'robinmyhr@gmail.com'
    LIMIT 1
)
GROUP BY pm.project_id, p.name
ORDER BY p.name;

-- If this returns 4 rows, the user is assigned to 4 projects
-- But as a foreman, this shouldn't limit access

-- ============================================================================
-- STEP 5: Verify RLS policy is active and correct
-- ============================================================================
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'projects'
AND cmd = 'SELECT';

-- Should see "Users can read accessible projects" policy
-- The qual should use can_access_project(id)

-- ============================================================================
-- STEP 6: Check can_access_project() function definition
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'can_access_project';

-- Verify the function checks is_foreman_or_admin() FIRST
-- before checking project_members












