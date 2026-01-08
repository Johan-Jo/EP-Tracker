-- Diagnose project access for user: robinmyhr@gmail.com
-- This script helps identify why this user only sees 4 projects

-- ============================================================================
-- STEP 1: Find the user and their role
-- ============================================================================
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    m.role,
    m.org_id,
    o.name as org_name
FROM profiles p
JOIN memberships m ON p.id = m.user_id
JOIN organizations o ON m.org_id = o.id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- Save the user_id and org_id for next steps

-- ============================================================================
-- STEP 2: Check which projects exist in the organization
-- ============================================================================
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.project_number,
    p.status,
    p.is_archived,
    p.created_at
FROM projects p
WHERE p.org_id = (
    SELECT m.org_id 
    FROM profiles pr
    JOIN memberships m ON pr.id = m.user_id
    WHERE pr.email = 'robinmyhr@gmail.com'
    AND m.is_active = TRUE
    LIMIT 1
)
ORDER BY p.name;

-- ============================================================================
-- STEP 3: Check which projects the user is assigned to
-- ============================================================================
SELECT 
    pm.id,
    pm.project_id,
    p.name as project_name,
    p.project_number,
    pm.created_at as assigned_at
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = (
    SELECT pr.id 
    FROM profiles pr
    WHERE pr.email = 'robinmyhr@gmail.com'
    LIMIT 1
)
ORDER BY p.name;

-- This should show the 4 projects the user can see:
-- - Lina
-- - Montage snickerier Saluhallen
-- - Saluhallen
-- - Stavros soffa

-- ============================================================================
-- STEP 4: Check user's role to understand access level
-- ============================================================================
-- If role is 'worker' or 'ue', they only see assigned projects
-- If role is 'foreman' or 'admin', they should see ALL projects
SELECT 
    m.role,
    CASE 
        WHEN m.role IN ('admin', 'foreman') THEN 'Should see ALL projects'
        WHEN m.role IN ('worker', 'ue') THEN 'Only sees assigned projects'
        ELSE 'Unknown role'
    END as access_level
FROM memberships m
JOIN profiles p ON m.user_id = p.id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- ============================================================================
-- STEP 5: List all projects user should have access to (based on role)
-- ============================================================================
-- If worker/ue: only projects in project_members
-- If foreman/admin: all active projects in org
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
    pr.project_number,
    pr.status,
    CASE 
        WHEN ui.role IN ('admin', 'foreman') THEN 'Access via role (all projects)'
        WHEN EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = pr.id 
            AND pm.user_id = ui.user_id
        ) THEN 'Access via project_members assignment'
        ELSE 'NO ACCESS'
    END as access_reason
FROM projects pr
CROSS JOIN user_info ui
WHERE pr.org_id = ui.org_id
AND pr.status = 'active'
AND pr.is_archived = false
ORDER BY pr.name;

-- ============================================================================
-- STEP 6: Add user to additional projects (if needed)
-- ============================================================================
-- Only run this if the user should have access to more projects
-- Replace PROJECT_ID with actual project ID

-- EXAMPLE (DO NOT RUN AS-IS):
-- INSERT INTO project_members (project_id, user_id, assigned_by)
-- VALUES (
--     'PROJECT_ID_HERE',  -- The project to add (replace with actual UUID)
--     (SELECT id FROM profiles WHERE email = 'robinmyhr@gmail.com'),  -- User ID
--     (SELECT user_id FROM memberships WHERE role = 'admin' LIMIT 1)  -- Admin who assigns
-- );

-- ============================================================================
-- STEP 7: Remove user from a project (if needed)
-- ============================================================================
-- Only run this if the user should NOT have access to a project

-- EXAMPLE (DO NOT RUN AS-IS):
-- DELETE FROM project_members
-- WHERE project_id = 'PROJECT_ID_HERE'  -- Replace with actual project UUID
-- AND user_id = (SELECT id FROM profiles WHERE email = 'robinmyhr@gmail.com');

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- The user robinmyhr@gmail.com sees only 4 projects because:
-- 1. They are likely a 'worker' or 'ue' role
-- 2. They are only assigned to those 4 projects in project_members table
-- 3. RLS policy filters projects based on can_access_project() function
-- 
-- To give them access to more projects:
-- - Add entries to project_members table for each project
-- - Or change their role to 'foreman' or 'admin' (if appropriate)
--
-- To manage project access via UI:
-- 1. Go to a project page
-- 2. Click "Team" tab
-- 3. Click "Hantera team" button
-- 4. Add/remove users from the project

