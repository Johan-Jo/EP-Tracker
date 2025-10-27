-- Test query to check if activity_log has data
SELECT COUNT(*) as total_activities, 
       COUNT(CASE WHEN type = 'time_entry' THEN 1 END) as time_entries,
       COUNT(CASE WHEN type = 'material' THEN 1 END) as materials
FROM activity_log 
WHERE org_id = (SELECT org_id FROM memberships LIMIT 1);

-- Also check if get_recent_activities_fast function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_recent_activities_fast';
