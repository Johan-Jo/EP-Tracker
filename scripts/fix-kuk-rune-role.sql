-- Fix Kuk-Rune's role from foreman to worker
-- This script updates the role in the memberships table

-- First, let's see current state
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    m.role as current_role,
    m.org_id,
    m.is_active
FROM profiles p
JOIN memberships m ON p.user_id = m.user_id
WHERE p.full_name ILIKE '%kuk%rune%' OR p.full_name ILIKE '%rune%';

-- Update role to worker
UPDATE memberships
SET role = 'worker'
WHERE user_id = (
    SELECT id 
    FROM profiles 
    WHERE full_name ILIKE '%kuk%rune%' OR full_name ILIKE '%rune%'
    LIMIT 1
)
AND role = 'foreman';

-- Verify the change
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    m.role as new_role,
    m.org_id,
    m.is_active
FROM profiles p
JOIN memberships m ON p.user_id = m.user_id
WHERE p.full_name ILIKE '%kuk%rune%' OR p.full_name ILIKE '%rune%';

