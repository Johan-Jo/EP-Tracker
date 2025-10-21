-- Connect user to organization
-- This script creates the user-organization relationship

-- First, let's see what we have:
SELECT 
  id,
  email,
  created_at 
FROM auth.users 
WHERE email = 'oi@johan.com.br';

-- Check organizations:
SELECT 
  id,
  name,
  created_at 
FROM organizations 
LIMIT 5;

-- Now insert the relationship into the correct table
-- Phase 1 schema might use one of these table names:
-- Option 1: organization_members
-- Option 2: user_organizations  
-- Option 3: memberships

-- Try inserting into organization_members (most common):
INSERT INTO organization_members (
  id,
  user_id,
  organization_id,
  role,
  joined_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  au.id,
  o.id,
  'admin',
  now(),
  now(),
  now()
FROM auth.users au
CROSS JOIN organizations o
WHERE au.email = 'oi@johan.com.br'
  AND NOT EXISTS (
    SELECT 1 
    FROM organization_members om 
    WHERE om.user_id = au.id 
      AND om.organization_id = o.id
  )
LIMIT 1;

-- Verify the connection:
SELECT 
  om.*,
  o.name as org_name,
  au.email as user_email
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN auth.users au ON au.id = om.user_id
WHERE au.email = 'oi@johan.com.br';

