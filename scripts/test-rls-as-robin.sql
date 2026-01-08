-- Test RLS while logged in as robinmyhr@gmail.com
-- Run this query while logged in as the user to see what RLS actually returns

-- ============================================================================
-- STEP 1: Verify current user and role
-- ============================================================================
SELECT 
    auth.uid() as current_auth_uid,
    p.id as profile_id,
    p.email,
    m.role,
    m.org_id,
    CASE 
        WHEN auth.uid() = p.id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as uid_match
FROM profiles p
JOIN memberships m ON p.id = m.user_id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- ============================================================================
-- STEP 2: Test user_role() function
-- ============================================================================
SELECT 
    user_role(m.org_id) as user_role_result,
    m.role as expected_role,
    CASE 
        WHEN user_role(m.org_id) = m.role THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as role_match
FROM memberships m
JOIN profiles p ON m.user_id = p.id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- ============================================================================
-- STEP 3: Test is_foreman_or_admin() function
-- ============================================================================
SELECT 
    is_foreman_or_admin(m.org_id) as is_foreman_result,
    m.role,
    CASE 
        WHEN m.role IN ('foreman', 'admin') AND is_foreman_or_admin(m.org_id) = TRUE THEN '✅ CORRECT'
        WHEN m.role IN ('foreman', 'admin') AND is_foreman_or_admin(m.org_id) = FALSE THEN '❌ WRONG - Should be TRUE'
        WHEN m.role NOT IN ('foreman', 'admin') AND is_foreman_or_admin(m.org_id) = FALSE THEN '✅ CORRECT'
        ELSE '❌ UNEXPECTED'
    END as function_status
FROM memberships m
JOIN profiles p ON m.user_id = p.id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- ============================================================================
-- STEP 4: Test can_access_project() for each project
-- ============================================================================
SELECT 
    p.id,
    p.name,
    p.status,
    p.is_archived,
    can_access_project(p.id) as can_access,
    is_foreman_or_admin(p.org_id) as is_foreman,
    CASE 
        WHEN can_access_project(p.id) = TRUE THEN '✅ Accessible'
        ELSE '❌ NOT Accessible'
    END as access_status
FROM projects p
WHERE p.org_id = (
    SELECT m.org_id 
    FROM memberships m
    JOIN profiles pr ON m.user_id = pr.id
    WHERE pr.email = 'robinmyhr@gmail.com'
    AND m.is_active = TRUE
    LIMIT 1
)
AND p.status = 'active'
AND p.is_archived = false
ORDER BY p.name;

-- Count how many projects are accessible
SELECT 
    COUNT(*) as total_projects,
    COUNT(*) FILTER (WHERE can_access_project(id) = TRUE) as accessible_projects,
    COUNT(*) FILTER (WHERE can_access_project(id) = FALSE) as inaccessible_projects
FROM projects
WHERE org_id = (
    SELECT m.org_id 
    FROM memberships m
    JOIN profiles pr ON m.user_id = pr.id
    WHERE pr.email = 'robinmyhr@gmail.com'
    AND m.is_active = TRUE
    LIMIT 1
)
AND status = 'active'
AND is_archived = false;

-- ============================================================================
-- STEP 5: What RLS actually returns (this is what the user sees)
-- ============================================================================
-- This query will be automatically filtered by RLS policy
SELECT 
    id,
    name,
    status,
    is_archived
FROM projects
WHERE status = 'active'
AND is_archived = false
ORDER BY name;

-- Count visible projects
SELECT COUNT(*) as visible_projects_count
FROM projects
WHERE status = 'active'
AND is_archived = false;

-- This should return ALL projects if RLS is working correctly
-- If it only returns 4, RLS is filtering incorrectly

-- ============================================================================
-- STEP 6: Check RLS policy
-- ============================================================================
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'projects'
AND cmd = 'SELECT';

-- Should see "Users can read accessible projects"
-- The qual should be: can_access_project(id)












