-- Check if there are any active time entries (checked in but not checked out)
-- These should trigger forgotten checkout alerts
-- Run this in Supabase SQL Editor

SELECT 
  te.id,
  te.user_id,
  p.email,
  p.full_name,
  te.project_id,
  pr.name as project_name,
  te.start_at,
  te.stop_at,
  pr.alert_settings->>'work_day_end' as work_day_end,
  pr.alert_settings->>'forgotten_checkout_enabled' as forgotten_checkout_enabled,
  pr.alert_settings->>'forgotten_checkout_minutes_after' as minutes_after
FROM time_entries te
LEFT JOIN profiles p ON p.id = te.user_id
LEFT JOIN projects pr ON pr.id = te.project_id
WHERE te.start_at >= CURRENT_DATE
  AND te.stop_at IS NULL
ORDER BY te.start_at DESC;

