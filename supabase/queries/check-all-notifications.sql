-- Check ALL notifications (any type) sent in the last 24 hours
-- This will show if the notification system is working at all
-- Run this in Supabase SQL Editor

SELECT 
  nl.id,
  nl.user_id,
  p.email,
  p.full_name,
  nl.type,
  nl.title,
  nl.delivery_status,
  nl.error_message,
  nl.sent_at
FROM notification_log nl
LEFT JOIN profiles p ON p.id = nl.user_id
WHERE nl.sent_at > NOW() - INTERVAL '24 hours'
ORDER BY nl.sent_at DESC
LIMIT 50;

