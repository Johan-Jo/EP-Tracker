-- Debug is_foreman_or_admin() function for robinmyhr@gmail.com
-- This will help us understand why RLS is not working correctly

-- ============================================================================
-- STEP 1: Get user info
-- ============================================================================
SELECT 
    p.id as user_id,
    p.email,
    m.role,
    m.org_id,
    o.name as org_name
FROM profiles p
JOIN memberships m ON p.id = m.user_id
JOIN organizations o ON m.org_id = o.id
WHERE p.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE;

-- ============================================================================
-- STEP 2: Test is_foreman_or_admin() function directly
-- ============================================================================
-- This must be run while logged in as robinmyhr@gmail.com
-- Replace ORG_ID with the org_id from step 1

-- First, let's see what user_role() returns
SELECT 
    user_role('ORG_ID_HERE'::UUID) as user_role_result;

-- Then test is_foreman_or_admin()
SELECT 
    is_foreman_or_admin('ORG_ID_HERE'::UUID) as is_foreman_or_admin_result;

-- ============================================================================
-- STEP 3: Test can_access_project() for each project
-- ============================================================================
-- This must be run while logged in as robinmyhr@gmail.com
-- Replace ORG_ID with the org_id from step 1

SELECT 
    p.id,
    p.name,
    p.status,
    p.is_archived,
    can_access_project(p.id) as can_access_result,
    is_foreman_or_admin(p.org_id) as is_foreman_result
FROM projects p
WHERE p.org_id = 'ORG_ID_HERE'::UUID
AND p.status = 'active'
AND p.is_archived = false
ORDER BY p.name;

-- If can_access_result is FALSE for some projects, that's the problem!
-- If is_foreman_result is FALSE, then is_foreman_or_admin() is not working

-- ============================================================================
-- STEP 4: Check is_foreman_or_admin() function definition
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'is_foreman_or_admin';

-- Verify it uses user_role() correctly
-- It should return TRUE if role is 'foreman' or 'admin'

-- ============================================================================
-- STEP 5: Check user_role() function definition
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'user_role';

-- This should return the role from memberships table
-- It uses auth.uid() to get current user

-- ============================================================================
-- STEP 6: Manual test - check if auth.uid() matches user_id
-- ============================================================================
-- This must be run while logged in as robinmyhr@gmail.com

SELECT 
    auth.uid() as current_auth_uid,
    p.id as profile_id,
    CASE 
        WHEN auth.uid() = p.id THEN 'MATCH - auth.uid() is correct'
        ELSE 'MISMATCH - auth.uid() does not match profile.id'
    END as uid_match_status
FROM profiles p
WHERE p.email = 'robinmyhr@gmail.com';

-- If there's a mismatch, that's the problem!
-- auth.uid() must match profiles.id for RLS to work

-- ============================================================================
-- STEP 7: Test what RLS actually returns
-- ============================================================================
-- This must be run while logged in as robinmyhr@gmail.com
-- RLS will automatically filter based on can_access_project()

SELECT 
    id,
    name,
    status,
    is_archived
FROM projects
WHERE status = 'active'
AND is_archived = false
ORDER BY name;

-- Count how many projects are returned
SELECT COUNT(*) as visible_projects_count
FROM projects
WHERE status = 'active'
AND is_archived = false;

-- This should return ALL projects if RLS is working correctly for foreman
-- If it only returns 4, RLS is filtering incorrectly

-- ============================================================================
-- POTENTIAL FIX: If is_foreman_or_admin() is not working
-- ============================================================================
-- If the function is not working, you might need to recreate it:

-- DROP FUNCTION IF EXISTS is_foreman_or_admin(UUID);
-- CREATE OR REPLACE FUNCTION is_foreman_or_admin(org_uuid UUID)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--     RETURN user_role(org_uuid) IN ('foreman', 'admin');
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;












