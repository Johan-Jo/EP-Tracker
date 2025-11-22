-- Check all forgotten checkout alerts sent in the last 24 hours
-- Run this in Supabase SQL Editor

SELECT 
  nl.id,
  nl.user_id,
  p.email,
  p.full_name,
  nl.type,
  nl.title,
  nl.body,
  nl.delivery_status,
  nl.error_message,
  nl.sent_at,
  nl.data->>'projectId' as project_id,
  pr.name as project_name
FROM notification_log nl
LEFT JOIN profiles p ON p.id = nl.user_id
LEFT JOIN projects pr ON pr.id::text = nl.data->>'projectId'
WHERE nl.type = 'forgotten_checkout_alert'
  AND nl.sent_at > NOW() - INTERVAL '24 hours'
ORDER BY nl.sent_at DESC;

