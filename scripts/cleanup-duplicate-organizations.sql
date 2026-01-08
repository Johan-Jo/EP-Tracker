-- Cleanup duplicate organizations for "Vansan Fastighet & Trädgård AB"
-- Keep the first one (oldest), delete the rest

-- Step 1: Show what will be deleted
SELECT 
    id,
    name,
    slug,
    created_at,
    (SELECT COUNT(*) FROM memberships WHERE org_id = o.id) as membership_count
FROM organizations o
WHERE LOWER(name) = LOWER('Vansan Fastighet & Trädgård AB')
ORDER BY created_at ASC;

-- Step 2: Delete duplicate organizations (keep the first one)
-- Only delete orgs with 0 memberships to be safe
DELETE FROM organizations
WHERE LOWER(name) = LOWER('Vansan Fastighet & Trädgård AB')
AND id != (SELECT id FROM organizations WHERE LOWER(name) = LOWER('Vansan Fastighet & Trädgård AB') ORDER BY created_at ASC LIMIT 1)
AND id NOT IN (SELECT DISTINCT org_id FROM memberships WHERE org_id IS NOT NULL);

-- Step 3: Verify cleanup
SELECT 
    id,
    name,
    slug,
    created_at
FROM organizations
WHERE LOWER(name) = LOWER('Vansan Fastighet & Trädgård AB')
ORDER BY created_at ASC;
