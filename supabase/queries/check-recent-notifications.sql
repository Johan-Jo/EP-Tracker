-- Check all notification types sent in the last hour
-- Run this in Supabase SQL Editor

SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed
FROM notification_log
WHERE sent_at > NOW() - INTERVAL '1 hour'
GROUP BY type
ORDER BY count DESC;

