-- Fix notification_log INSERT permissions
-- Add INSERT policy and grant INSERT permission

-- Drop policy if it exists (to avoid errors on re-run)
DROP POLICY IF EXISTS "Service role can insert notification log" ON notification_log;

-- Add INSERT policy for notification_log
-- Allow service role (admin client) to insert notifications
CREATE POLICY "Service role can insert notification log"
  ON notification_log FOR INSERT
  WITH CHECK (true);

-- Grant INSERT permission to authenticated users (for admin client)
GRANT INSERT ON notification_log TO authenticated;

-- Also ensure service_role can insert (for admin client)
GRANT INSERT ON notification_log TO service_role;

