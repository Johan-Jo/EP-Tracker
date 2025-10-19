-- Grant admin privileges to oi@johan.com.br
-- Run this in your Supabase SQL Editor

-- Update the user's role to 'admin' in the memberships table
UPDATE memberships
SET 
  role = 'admin',
  updated_at = NOW()
WHERE user_id = (
  SELECT id 
  FROM profiles 
  WHERE email = 'oi@johan.com.br'
)
AND is_active = true;

-- Verify the change
SELECT 
  p.email,
  p.full_name,
  m.role,
  o.name AS organization_name,
  m.updated_at
FROM memberships m
JOIN profiles p ON m.user_id = p.id
JOIN organizations o ON m.org_id = o.id
WHERE p.email = 'oi@johan.com.br'
AND m.is_active = true;

