-- Fix orphaned user vanessa.santos@vansan.se
-- Option 1: Delete the orphaned profile so she can register again
-- Option 2: Create membership to the first organization

-- Check current status
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COUNT(m.id) as membership_count
FROM profiles p
LEFT JOIN memberships m ON p.id = m.user_id
WHERE LOWER(p.email) = LOWER('vanessa.santos@vansan.se')
GROUP BY p.id, p.email, p.full_name;

-- OPTION 1: Delete orphaned profile (user can register again)
-- WARNING: This will also delete the user from auth.users if cascade is set
-- DELETE FROM profiles WHERE LOWER(email) = LOWER('vanessa.santos@vansan.se');

-- OPTION 2: Create membership to first organization (recommended)
-- First, get the first organization ID
DO $$
DECLARE
    org_id_val UUID;
    user_id_val UUID;
BEGIN
    -- Get first organization
    SELECT id INTO org_id_val
    FROM organizations
    WHERE LOWER(name) = LOWER('Vansan Fastighet & Trädgård AB')
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Get user ID
    SELECT id INTO user_id_val
    FROM profiles
    WHERE LOWER(email) = LOWER('vanessa.santos@vansan.se');
    
    -- Create membership if both exist
    IF org_id_val IS NOT NULL AND user_id_val IS NOT NULL THEN
        INSERT INTO memberships (user_id, org_id, role, is_active)
        VALUES (user_id_val, org_id_val, 'admin', true)
        ON CONFLICT (org_id, user_id) DO NOTHING;
        
        RAISE NOTICE 'Created membership for user % to organization %', user_id_val, org_id_val;
    ELSE
        RAISE NOTICE 'Could not find organization or user';
    END IF;
END $$;
