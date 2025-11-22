-- Check recent notifications for a specific user
-- Replace 'oi@johan.com.br' with the email you want to check
-- Run this in Supabase SQL Editor

SELECT 
  nl.*,
  p.email,
  p.full_name
FROM notification_log nl
LEFT JOIN profiles p ON p.id = nl.user_id
WHERE p.email = 'oi@johan.com.br'
  AND nl.sent_at > NOW() - INTERVAL '24 hours'
ORDER BY nl.sent_at DESC;

