-- Quick script to add a worker to a project
-- Usage: Replace USER_EMAIL and PROJECT_NAME with actual values

-- ============================================================================
-- STEP 1: Find the worker
-- ============================================================================
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    m.role
FROM profiles p
JOIN memberships m ON p.user_id = m.user_id
WHERE p.email = 'j@johan.com.br'  -- CHANGE THIS to the worker's email
AND m.is_active = TRUE;

-- Copy the user_id from above

-- ============================================================================
-- STEP 2: Find the project
-- ============================================================================
SELECT 
    id as project_id,
    name as project_name,
    project_number,
    org_id
FROM projects
WHERE name ILIKE '%Luderkvart%';  -- CHANGE THIS to the project name
-- OR use project_number:
-- WHERE project_number = 'Lulu-69';

-- Copy the project_id from above

-- ============================================================================
-- STEP 3: Check if already a member
-- ============================================================================
SELECT 
    pm.id,
    p_proj.name as project_name,
    p_user.full_name as member_name,
    pm.created_at
FROM project_members pm
JOIN projects p_proj ON pm.project_id = p_proj.id
JOIN profiles p_user ON pm.user_id = p_user.id
WHERE pm.user_id = 'USER_ID_HERE'  -- PASTE user_id from step 1
AND pm.project_id = 'PROJECT_ID_HERE';  -- PASTE project_id from step 2

-- If this returns a row, the user is already a member

-- ============================================================================
-- STEP 4: Add worker to project
-- ============================================================================
INSERT INTO project_members (project_id, user_id, assigned_by)
VALUES (
    'PROJECT_ID_HERE',  -- PASTE project_id from step 2
    'USER_ID_HERE',     -- PASTE user_id from step 1
    (SELECT user_id FROM memberships WHERE role = 'admin' LIMIT 1)  -- Auto-assign first admin as assigner
)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ============================================================================
-- STEP 5: Verify the addition
-- ============================================================================
SELECT 
    p_proj.name as project_name,
    p_user.full_name as member_name,
    p_user.email,
    pm.created_at,
    p_assigner.full_name as assigned_by_name
FROM project_members pm
JOIN projects p_proj ON pm.project_id = p_proj.id
JOIN profiles p_user ON pm.user_id = p_user.id
LEFT JOIN profiles p_assigner ON pm.assigned_by = p_assigner.id
WHERE pm.user_id = 'USER_ID_HERE'  -- PASTE user_id from step 1
ORDER BY pm.created_at DESC;

-- ============================================================================
-- EXAMPLE: Add Kuk-Rune to "Luderkvart på taket" project
-- ============================================================================
-- 1. Find Kuk-Rune's user_id:
SELECT id FROM profiles WHERE full_name ILIKE '%kuk%rune%';

-- 2. Find the project_id:
SELECT id FROM projects WHERE name ILIKE '%Luderkvart%';

-- 3. Insert (replace IDs with actual values):
-- INSERT INTO project_members (project_id, user_id, assigned_by)
-- VALUES (
--     '...',  -- project_id
--     '...',  -- user_id (Kuk-Rune)
--     (SELECT user_id FROM memberships WHERE role = 'admin' LIMIT 1)
-- );

