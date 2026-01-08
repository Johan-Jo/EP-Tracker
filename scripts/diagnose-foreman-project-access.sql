-- Diagnose why foreman robinmyhr@gmail.com only sees 4 projects
-- This script checks RLS policies, user role, and project access

-- ============================================================================
-- STEP 1: Find user and verify role
-- ============================================================================
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    m.role,
    m.org_id,
    m.is_active as membership_active,
    o.name as org_name,
    CASE 
        WHEN m.role IN ('admin', 'foreman') THEN 'Should see ALL projects (no project_members needed)'
        WHEN m.role IN ('worker', 'ue') THEN 'Only sees projects in project_members table'
        ELSE 'Unknown role'
    END as access_explanation
FROM profiles p
JOIN memberships m ON p.id = m.user_id
JOIN organizations o ON m.org_id = o.id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- Save user_id and org_id for next steps
-- 
-- IMPORTANT: If role is 'foreman' or 'admin', user should see ALL projects
-- in their organization WITHOUT needing to be in project_members table!

-- ============================================================================
-- STEP 2: Count ALL projects in the organization (regardless of status)
-- ============================================================================
-- Replace ORG_ID with the org_id from step 1
SELECT 
    COUNT(*) as total_projects,
    COUNT(*) FILTER (WHERE status = 'active') as active_projects,
    COUNT(*) FILTER (WHERE is_archived = false) as non_archived_projects,
    COUNT(*) FILTER (WHERE status = 'active' AND is_archived = false) as active_non_archived_projects
FROM projects
WHERE org_id = 'ORG_ID_HERE';  -- Replace with actual org_id

-- ============================================================================
-- STEP 3: List ALL projects in organization with details
-- ============================================================================
SELECT 
    p.id,
    p.name,
    p.project_number,
    p.status,
    p.is_archived,
    p.created_at
FROM projects p
WHERE p.org_id = 'ORG_ID_HERE'  -- Replace with actual org_id
ORDER BY p.name;

-- ============================================================================
-- STEP 4: Test RLS function can_access_project() for each project
-- ============================================================================
-- This simulates what RLS policy does
-- Replace USER_ID and ORG_ID with values from step 1
WITH user_info AS (
    SELECT 
        'USER_ID_HERE'::UUID as user_id,  -- Replace with actual user_id
        'ORG_ID_HERE'::UUID as org_id     -- Replace with actual org_id
),
user_role_check AS (
    SELECT 
        m.role,
        CASE 
            WHEN m.role IN ('admin', 'foreman') THEN TRUE
            ELSE FALSE
        END as is_foreman_or_admin
    FROM memberships m
    CROSS JOIN user_info ui
    WHERE m.user_id = ui.user_id
    AND m.org_id = ui.org_id
    AND m.is_active = TRUE
    LIMIT 1
)
SELECT 
    p.id,
    p.name,
    p.status,
    p.is_archived,
    urc.role,
    urc.is_foreman_or_admin,
    CASE 
        WHEN urc.is_foreman_or_admin THEN 'Should have access (foreman/admin)'
        WHEN EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = p.id 
            AND pm.user_id = (SELECT user_id FROM user_info)
        ) THEN 'Has access via project_members'
        ELSE 'NO ACCESS'
    END as access_status
FROM projects p
CROSS JOIN user_info ui
CROSS JOIN user_role_check urc
WHERE p.org_id = ui.org_id
ORDER BY p.name;

-- ============================================================================
-- STEP 5: Check what projects user_projects() function would return
-- ============================================================================
-- This tests the user_projects() function directly
-- Note: This must be run as the actual user (auth.uid() must be set)
-- Run this query while logged in as robinmyhr@gmail.com

SELECT 
    p.id,
    p.name,
    p.status,
    p.is_archived
FROM projects p
WHERE p.id IN (
    SELECT * FROM user_projects()
)
ORDER BY p.name;

-- ============================================================================
-- STEP 6: Check if there are projects in project_members for this user
-- ============================================================================
-- Replace USER_ID with the user_id from step 1
SELECT 
    pm.project_id,
    p.name as project_name,
    p.status,
    p.is_archived,
    pm.created_at as assigned_at
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = 'USER_ID_HERE'  -- Replace with actual user_id
ORDER BY p.name;

-- If this returns 4 rows, it means the user is assigned to exactly 4 projects
-- Even as a foreman, if they're in project_members, RLS might be checking that first

-- ============================================================================
-- STEP 7: Check RLS policies on projects table
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'projects'
AND cmd = 'SELECT';

-- Should see "Users can read accessible projects" policy
-- If you see "Users can read org projects", the old policy is still active!

-- ============================================================================
-- STEP 8: Verify can_access_project() function exists and is correct
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'can_access_project';

-- ============================================================================
-- POTENTIAL ISSUES TO CHECK:
-- ============================================================================
-- 1. If user is foreman but only sees 4 projects:
--    - Check if there are only 4 active, non-archived projects in the org
--    - Check if RLS policy "Users can read accessible projects" is active
--    - Check if can_access_project() function is working correctly
--
-- 2. If user is in project_members table:
--    - Even foremen might be restricted if they're explicitly in project_members
--    - The can_access_project() function should still return TRUE for foremen
--    - But if there's a bug, it might check project_members first
--
-- 3. If projects are in different organization:
--    - User can only see projects in their own org_id
--    - Check if there are projects in other orgs that should be visible
--
-- 4. If projects are archived or inactive:
--    - The query filters: status='active' AND is_archived=false
--    - Check if other projects are archived or have different status

