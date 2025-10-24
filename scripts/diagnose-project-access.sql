-- Diagnose and fix project access for workers
-- This script helps identify why a worker sees projects they shouldn't

-- ============================================================================
-- STEP 1: Check if project_members table exists
-- ============================================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'project_members';

-- If the table doesn't exist, you need to run the migration:
-- 20241024000003_add_project_members.sql

-- ============================================================================
-- STEP 2: Check which RLS policy is active on projects table
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
WHERE tablename = 'projects';

-- You should see "Users can read accessible projects" policy
-- If you see "Users can read org projects", the old policy is still active

-- ============================================================================
-- STEP 3: Find the user (Kuk-Rune)
-- ============================================================================
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    m.role,
    m.org_id
FROM profiles p
JOIN memberships m ON p.user_id = m.user_id
WHERE p.full_name ILIKE '%kuk%rune%' OR p.full_name ILIKE '%rune%'
AND m.is_active = TRUE;

-- Save the user_id for next steps

-- ============================================================================
-- STEP 4: Check which projects exist in the organization
-- ============================================================================
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.project_number,
    p.status,
    p.org_id
FROM projects p
WHERE p.org_id = (
    SELECT m.org_id 
    FROM memberships m 
    JOIN profiles pr ON m.user_id = pr.user_id
    WHERE pr.full_name ILIKE '%kuk%rune%'
    AND m.is_active = TRUE
    LIMIT 1
)
ORDER BY p.created_at DESC;

-- ============================================================================
-- STEP 5: Check which projects the user is assigned to
-- ============================================================================
SELECT 
    pm.id,
    pm.project_id,
    p.name as project_name,
    p.project_number,
    pm.user_id,
    pm.created_at
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = (
    SELECT id 
    FROM profiles 
    WHERE full_name ILIKE '%kuk%rune%'
    LIMIT 1
);

-- If this returns 0 rows, the user is not assigned to any project
-- This is why they shouldn't see any projects as a worker

-- ============================================================================
-- STEP 6: Add user to a specific project (EXAMPLE)
-- ============================================================================
-- Replace PROJECT_ID and USER_ID with actual values from steps 3 and 4

-- EXAMPLE (DO NOT RUN AS-IS):
-- INSERT INTO project_members (project_id, user_id, assigned_by)
-- VALUES (
--     'PROJECT_ID_HERE',
--     'USER_ID_HERE', 
--     (SELECT user_id FROM memberships WHERE role = 'admin' LIMIT 1)
-- );

-- ============================================================================
-- STEP 7: Verify the user can now access the project
-- ============================================================================
-- Run step 5 again to see if the user is now in the project

-- ============================================================================
-- IMPORTANT: If project_members table doesn't exist
-- ============================================================================
-- You need to run the migration manually. Go to:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
-- 
-- Then copy and paste the contents of:
-- supabase/migrations/20241024000003_add_project_members.sql
--
-- This will:
-- 1. Create the project_members table
-- 2. Update RLS policies to use project-level access
-- 3. Automatically assign existing workers to all projects (one-time)

