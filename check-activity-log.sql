-- Check what data is actually in activity_log
SELECT 
    type,
    description,
    data->>'start_at' as start_at_value,
    data,
    created_at
FROM activity_log 
WHERE org_id = (SELECT org_id FROM memberships LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;
