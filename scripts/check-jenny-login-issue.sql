-- Diagnostic script to check login issues for jenny.everskog@respondi.se
-- Run this in Supabase SQL Editor to diagnose login problems

-- ============================================================================
-- STEP 1: Check if user exists in auth.users
-- ============================================================================
SELECT 
    id,
    email,
    email_confirmed_at,
    confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    banned_until,
    deleted_at,
    CASE 
        WHEN email_confirmed_at IS NULL AND confirmed_at IS NULL THEN '❌ EMAIL NOT CONFIRMED'
        WHEN banned_until IS NOT NULL AND banned_until > NOW() THEN '❌ ACCOUNT BANNED'
        WHEN deleted_at IS NOT NULL THEN '❌ ACCOUNT DELETED'
        ELSE '✅ Account looks OK'
    END as auth_status
FROM auth.users
WHERE email = 'jenny.everskog@respondi.se';

-- ============================================================================
-- STEP 2: Check if user has a profile
-- ============================================================================
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    CASE 
        WHEN p.id IS NULL THEN '❌ NO PROFILE'
        ELSE '✅ Profile exists'
    END as profile_status
FROM profiles p
WHERE p.email = 'jenny.everskog@respondi.se';

-- ============================================================================
-- STEP 3: Check membership status
-- ============================================================================
SELECT 
    m.id as membership_id,
    m.user_id,
    m.org_id,
    m.role,
    m.is_active,
    m.created_at,
    o.name as org_name,
    CASE 
        WHEN m.id IS NULL THEN '❌ NO MEMBERSHIP'
        WHEN m.is_active = false THEN '❌ MEMBERSHIP INACTIVE'
        ELSE '✅ Active membership'
    END as membership_status
FROM profiles p
LEFT JOIN memberships m ON p.id = m.user_id AND m.is_active = true
LEFT JOIN organizations o ON m.org_id = o.id
WHERE p.email = 'jenny.everskog@respondi.se';

-- ============================================================================
-- STEP 4: Comprehensive status check (all in one)
-- ============================================================================
WITH user_info AS (
    SELECT 
        au.id,
        au.email,
        au.email_confirmed_at,
        au.confirmed_at,
        au.banned_until,
        au.deleted_at,
        au.last_sign_in_at,
        p.id as profile_id,
        p.full_name,
        m.id as membership_id,
        m.org_id,
        m.role,
        m.is_active as membership_active,
        o.name as org_name
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    LEFT JOIN memberships m ON p.id = m.user_id
    LEFT JOIN organizations o ON m.org_id = o.id
    WHERE au.email = 'jenny.everskog@respondi.se'
)
SELECT 
    email,
    CASE 
        WHEN id IS NULL THEN '❌ USER DOES NOT EXIST IN AUTH.USERS'
        WHEN deleted_at IS NOT NULL THEN '❌ ACCOUNT DELETED'
        WHEN banned_until IS NOT NULL AND banned_until > NOW() THEN '❌ ACCOUNT BANNED UNTIL ' || banned_until::text
        WHEN email_confirmed_at IS NULL AND confirmed_at IS NULL THEN '❌ EMAIL NOT CONFIRMED - This is likely the issue!'
        WHEN profile_id IS NULL THEN '❌ NO PROFILE - User exists but has no profile'
        WHEN membership_id IS NULL THEN '❌ NO ACTIVE MEMBERSHIP - User exists but not in any organization'
        WHEN membership_active = false THEN '❌ MEMBERSHIP INACTIVE'
        ELSE '✅ Account appears to be OK - Check password'
    END as diagnostic_result,
    email_confirmed_at,
    confirmed_at,
    last_sign_in_at,
    full_name,
    org_name,
    role
FROM user_info;

-- ============================================================================
-- STEP 5: If email is not confirmed, check if we can confirm it
-- ============================================================================
-- This will show what would happen if we try to confirm the email
DO $$
DECLARE
    target_email TEXT := 'jenny.everskog@respondi.se';
    target_user_id UUID;
    user_confirmed BOOLEAN := FALSE;
BEGIN
    -- Get the user_id
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE '❌ User with email % does not exist in auth.users', target_email;
    ELSE
        RAISE NOTICE '✅ Found user: % with ID: %', target_email, target_user_id;
        
        -- Check if already confirmed
        SELECT (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL) INTO user_confirmed
        FROM auth.users
        WHERE id = target_user_id;
        
        IF user_confirmed THEN
            RAISE NOTICE '✅ Email is already confirmed';
        ELSE
            RAISE NOTICE '❌ Email is NOT confirmed - This is likely preventing login!';
            RAISE NOTICE '';
            RAISE NOTICE 'To fix this, run the following UPDATE:';
            RAISE NOTICE 'UPDATE auth.users';
            RAISE NOTICE 'SET email_confirmed_at = NOW(),';
            RAISE NOTICE '    confirmed_at = NOW()';
            RAISE NOTICE 'WHERE email = ''%'';', target_email;
        END IF;
    END IF;
END $$;
