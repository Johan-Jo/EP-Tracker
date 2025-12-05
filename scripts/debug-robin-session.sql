-- ============================================================================
-- DEBUG: Session/Auth Issues for robinmyhr@gmail.com
-- ============================================================================
-- Run this script in Supabase SQL Editor to diagnose why Robin gets logged out
-- when navigating to the projects page.

-- ============================================================================
-- STEP 1: Check if user exists in auth.users
-- ============================================================================
SELECT 
    id as user_id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    raw_user_meta_data,
    aud,
    role
FROM auth.users
WHERE email = 'robinmyhr@gmail.com';

-- ============================================================================
-- STEP 2: Check if profile exists
-- ============================================================================
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.created_at,
    p.updated_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'robinmyhr@gmail.com';

-- ============================================================================
-- STEP 3: Check membership status (CRITICAL)
-- ============================================================================
SELECT 
    m.id as membership_id,
    m.user_id,
    m.org_id,
    m.role,
    m.is_active,  -- THIS MUST BE TRUE!
    m.hourly_rate_sek,
    m.created_at,
    m.updated_at,
    o.name as org_name
FROM memberships m
JOIN organizations o ON m.org_id = o.id
JOIN auth.users u ON m.user_id = u.id
WHERE u.email = 'robinmyhr@gmail.com';

-- ============================================================================
-- STEP 4: Verify there's only ONE active membership
-- ============================================================================
-- Multiple active memberships could cause issues with .single() query
SELECT 
    COUNT(*) as active_membership_count,
    u.email
FROM memberships m
JOIN auth.users u ON m.user_id = u.id
WHERE u.email = 'robinmyhr@gmail.com'
AND m.is_active = TRUE
GROUP BY u.email;

-- ============================================================================
-- STEP 5: Check RLS policies on memberships
-- ============================================================================
SELECT 
    policyname,
    cmd,
    qual::text as using_expression,
    with_check::text
FROM pg_policies
WHERE tablename = 'memberships'
ORDER BY policyname;

-- ============================================================================
-- STEP 6: Check RLS policies on profiles
-- ============================================================================
SELECT 
    policyname,
    cmd,
    qual::text as using_expression,
    with_check::text
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- STEP 7: Test membership query directly (simulates getSession query)
-- ============================================================================
-- This is the exact query that getSession() runs
-- Replace the UUID below with Robin's actual user_id from STEP 1
/*
SELECT 
    org_id, 
    role, 
    hourly_rate_sek
FROM memberships
WHERE user_id = 'REPLACE_WITH_ROBIN_USER_ID'
AND is_active = TRUE;
*/

-- ============================================================================
-- STEP 8: Check if there are any orphaned records
-- ============================================================================
-- Users in memberships but not in profiles
SELECT 
    m.user_id,
    m.org_id,
    m.role,
    m.is_active,
    u.email
FROM memberships m
JOIN auth.users u ON m.user_id = u.id
LEFT JOIN profiles p ON m.user_id = p.id
WHERE p.id IS NULL
AND u.email = 'robinmyhr@gmail.com';

-- ============================================================================
-- STEP 9: Test if RLS functions work correctly for Robin
-- ============================================================================
-- Note: These functions are SECURITY DEFINER, so they bypass RLS
-- Get Robin's user ID first, then test:
/*
-- Test is_org_member (replace UUIDs)
SELECT is_org_member('ROBIN_ORG_ID');

-- Test user_role (replace UUIDs)
SELECT user_role('ROBIN_ORG_ID');

-- Test is_foreman_or_admin (replace UUIDs)
SELECT is_foreman_or_admin('ROBIN_ORG_ID');

-- Test user_orgs (should return Robin's org_id)
SELECT user_orgs();
*/

-- ============================================================================
-- STEP 10: Check for any recent audit log entries for Robin
-- ============================================================================
SELECT 
    al.id,
    al.action,
    al.table_name,
    al.record_id,
    al.old_data,
    al.new_data,
    al.created_at
FROM audit_log al
JOIN auth.users u ON al.user_id = u.id
WHERE u.email = 'robinmyhr@gmail.com'
ORDER BY al.created_at DESC
LIMIT 20;

-- ============================================================================
-- FIX: If membership is_active is FALSE, activate it
-- ============================================================================
/*
UPDATE memberships
SET is_active = TRUE, updated_at = NOW()
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'robinmyhr@gmail.com'
)
AND is_active = FALSE;
*/

-- ============================================================================
-- FIX: If profile is missing, create one
-- ============================================================================
/*
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
    id, 
    email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    NOW(),
    NOW()
FROM auth.users
WHERE email = 'robinmyhr@gmail.com'
ON CONFLICT (id) DO NOTHING;
*/

