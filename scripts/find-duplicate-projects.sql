-- Script to find duplicate projects
-- Run this first to see what duplicates exist before removing them

-- Find duplicates by name and org_id
SELECT 
    p.id,
    p.org_id,
    o.name as org_name,
    p.name as project_name,
    p.project_number,
    p.client_name,
    p.status,
    p.created_at,
    p.updated_at,
    -- Count related data
    (SELECT COUNT(*) FROM phases WHERE project_id = p.id) as phase_count,
    (SELECT COUNT(*) FROM work_orders WHERE project_id = p.id) as work_order_count,
    (SELECT COUNT(*) FROM time_entries WHERE project_id = p.id) as time_entry_count,
    (SELECT COUNT(*) FROM materials WHERE project_id = p.id) as material_count,
    (SELECT COUNT(*) FROM expenses WHERE project_id = p.id) as expense_count,
    (SELECT COUNT(*) FROM ata WHERE project_id = p.id) as ata_count,
    (SELECT COUNT(*) FROM diary_entries WHERE project_id = p.id) as diary_count,
    (SELECT COUNT(*) FROM checklists WHERE project_id = p.id) as checklist_count,
    (SELECT COUNT(*) FROM assignments WHERE project_id = p.id) as assignment_count
FROM projects p
JOIN organizations o ON p.org_id = o.id
WHERE p.name IN (
    SELECT p2.name 
    FROM projects p2
    WHERE p2.name IS NOT NULL
    GROUP BY p2.org_id, p2.name
    HAVING COUNT(*) > 1
)
ORDER BY p.org_id, p.name, p.created_at ASC;

-- Summary of duplicate groups (by name and org_id, ignoring project_number)
SELECT 
    p.org_id,
    o.name as org_name,
    p.name as project_name,
    array_agg(DISTINCT p.project_number ORDER BY p.project_number) FILTER (WHERE p.project_number IS NOT NULL) as project_numbers,
    COUNT(*) as duplicate_count,
    MIN(p.created_at) as oldest_created,
    MAX(p.created_at) as newest_created,
    array_agg(p.id ORDER BY p.created_at ASC) as project_ids
FROM projects p
JOIN organizations o ON p.org_id = o.id
WHERE p.name IS NOT NULL
GROUP BY p.org_id, o.name, p.name
HAVING COUNT(*) > 1
ORDER BY p.org_id, p.name;

-- Summary of duplicate groups (by name, org_id, AND project_number - stricter)
SELECT 
    p.org_id,
    o.name as org_name,
    p.name as project_name,
    MAX(p.project_number) as project_number,
    COUNT(*) as duplicate_count,
    MIN(p.created_at) as oldest_created,
    MAX(p.created_at) as newest_created,
    array_agg(p.id ORDER BY p.created_at ASC) as project_ids
FROM projects p
JOIN organizations o ON p.org_id = o.id
WHERE p.name IS NOT NULL
GROUP BY p.org_id, o.name, p.name, COALESCE(p.project_number, '')
HAVING COUNT(*) > 1
ORDER BY p.org_id, p.name;

