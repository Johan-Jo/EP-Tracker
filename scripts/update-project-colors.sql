-- Update existing projects with unique colors
-- Run this in Supabase SQL Editor

-- Get all projects and assign colors
WITH project_list AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM projects
  WHERE org_id = (SELECT id FROM organizations LIMIT 1)
)
UPDATE projects
SET 
  color = CASE 
    WHEN (SELECT rn FROM project_list WHERE project_list.id = projects.id) % 7 = 0 THEN '#4F46E5' -- Indigo
    WHEN (SELECT rn FROM project_list WHERE project_list.id = projects.id) % 7 = 1 THEN '#EF4444' -- Red
    WHEN (SELECT rn FROM project_list WHERE project_list.id = projects.id) % 7 = 2 THEN '#10B981' -- Green
    WHEN (SELECT rn FROM project_list WHERE project_list.id = projects.id) % 7 = 3 THEN '#F59E0B' -- Amber
    WHEN (SELECT rn FROM project_list WHERE project_list.id = projects.id) % 7 = 4 THEN '#3B82F6' -- Blue
    WHEN (SELECT rn FROM project_list WHERE project_list.id = projects.id) % 7 = 5 THEN '#8B5CF6' -- Purple
    ELSE '#EC4899' -- Pink
  END,
  daily_capacity_need = 2
WHERE id IN (SELECT id FROM project_list);

-- Verify the update
SELECT 
  name,
  color,
  daily_capacity_need
FROM projects
ORDER BY created_at
LIMIT 10;

