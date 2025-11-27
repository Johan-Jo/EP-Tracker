-- Delete all work orders for mkmatte@gmail.com
-- Organization: Event concept management AB
-- Organization ID: 4074c491-c5d2-4107-8d7a-8a17dea3b76f
-- 
-- WARNING: This will permanently delete all work orders for this organization!
-- Make sure you have a backup if needed.

-- First, delete work order assignments (foreign key constraint)
DELETE FROM work_order_assignments
WHERE work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    JOIN memberships m ON m.org_id = wo.organization_id
    JOIN profiles p ON p.id = m.user_id
    WHERE p.email = 'mkmatte@gmail.com'
);

-- Then delete the work orders
DELETE FROM work_orders
WHERE organization_id IN (
    SELECT m.org_id
    FROM memberships m
    JOIN profiles p ON p.id = m.user_id
    WHERE p.email = 'mkmatte@gmail.com'
);

-- Verify deletion
SELECT 
    COUNT(*) as remaining_work_orders
FROM work_orders wo
JOIN memberships m ON m.org_id = wo.organization_id
JOIN profiles p ON p.id = m.user_id
WHERE p.email = 'mkmatte@gmail.com';

