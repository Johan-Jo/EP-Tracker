-- EPIC 25: Web Push Notifications
-- Add tables for push notification functionality

-- =====================================================
-- PART 1: Push Subscriptions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- FCM token
  fcm_token text NOT NULL UNIQUE,
  
  -- Device info
  device_type text CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser text,
  os text,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_org ON push_subscriptions(org_id) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_token ON push_subscriptions(fcm_token) WHERE is_active = true;

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- PART 2: Notification Preferences Table
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Global toggle
  enabled boolean DEFAULT true,
  
  -- Notification types
  checkout_reminders boolean DEFAULT true,
  team_checkin boolean DEFAULT true,
  approvals boolean DEFAULT true,
  project_alerts boolean DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_enabled ON notification_preferences(user_id) WHERE enabled = true;

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PART 3: Notification Log Table
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Notification details
  type text NOT NULL CHECK (type IN (
    'checkout_reminder',
    'team_checkin',
    'approval_needed',
    'approval_confirmed',
    'late_checkin_alert',
    'forgotten_checkout_alert'
  )),
  title text NOT NULL,
  body text NOT NULL,
  
  -- Metadata
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  related_entity_type text, -- 'time_entry', 'material', 'expense', etc.
  related_entity_id uuid,
  
  -- Status
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'skipped')),
  fcm_response jsonb,
  error_message text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

-- Indexes
CREATE INDEX idx_notification_log_user ON notification_log(user_id, created_at DESC);
CREATE INDEX idx_notification_log_org ON notification_log(org_id, created_at DESC);
CREATE INDEX idx_notification_log_type ON notification_log(type, created_at DESC);
CREATE INDEX idx_notification_log_project ON notification_log(project_id) WHERE project_id IS NOT NULL;

-- RLS Policies
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification log"
  ON notification_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert (for backend)
CREATE POLICY "Service can insert notifications"
  ON notification_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =====================================================
-- PART 4: Helper Functions
-- =====================================================

-- Function to check if user is in quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(
  p_user_id uuid,
  p_now_time time DEFAULT LOCALTIME
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_enabled boolean;
  v_start time;
  v_end time;
  v_in_quiet_hours boolean;
BEGIN
  -- Get user's quiet hours settings
  SELECT 
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO v_enabled, v_start, v_end
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If not enabled or no settings, return false
  IF NOT v_enabled OR v_start IS NULL OR v_end IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if current time is within quiet hours
  IF v_start < v_end THEN
    -- Normal case: e.g., 22:00 to 07:00 (next day)
    v_in_quiet_hours := p_now_time >= v_start OR p_now_time < v_end;
  ELSE
    -- Wraps midnight: e.g., 22:00 to 07:00
    v_in_quiet_hours := p_now_time >= v_start OR p_now_time < v_end;
  END IF;
  
  RETURN v_in_quiet_hours;
END;
$$;

-- Function to get active FCM tokens for a user
CREATE OR REPLACE FUNCTION get_user_fcm_tokens(p_user_id uuid)
RETURNS TABLE (fcm_token text)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT ps.fcm_token
  FROM push_subscriptions ps
  WHERE ps.user_id = p_user_id
    AND ps.is_active = true;
END;
$$;

-- =====================================================
-- PART 5: Add Project Alert Settings
-- =====================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS alert_settings jsonb DEFAULT '{
  "work_day_start": "07:00",
  "work_day_end": "16:00",
  "checkin_reminder_enabled": true,
  "checkin_reminder_minutes_before": 15,
  "checkout_reminder_enabled": true,
  "checkout_reminder_minutes_before": 15,
  "late_checkin_alert_enabled": true,
  "late_checkin_alert_minutes_after": 15,
  "forgotten_checkout_alert_enabled": true,
  "forgotten_checkout_alert_minutes_after": 30,
  "alert_recipients": ["foreman", "admin"]
}'::jsonb;

-- =====================================================
-- PART 6: Cleanup Function
-- =====================================================

-- Clean up old notifications (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete notifications older than 30 days
  DELETE FROM notification_log
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Deactivate unused subscriptions (no activity in 90 days)
  UPDATE push_subscriptions
  SET is_active = false
  WHERE last_used_at < NOW() - INTERVAL '90 days'
    AND is_active = true;
    
  RAISE NOTICE 'Cleaned up old notifications and inactive subscriptions';
END;
$$;

-- =====================================================
-- PART 7: Grants
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT ON notification_log TO authenticated;
GRANT ALL ON notification_log TO service_role;

-- =====================================================
-- PART 8: Comments
-- =====================================================

COMMENT ON TABLE push_subscriptions IS 'EPIC 25: Stores FCM tokens for push notifications';
COMMENT ON TABLE notification_preferences IS 'EPIC 25: User notification preferences and quiet hours';
COMMENT ON TABLE notification_log IS 'EPIC 25: Audit trail of sent notifications';
COMMENT ON FUNCTION is_in_quiet_hours IS 'EPIC 25: Check if user is currently in quiet hours';
COMMENT ON FUNCTION get_user_fcm_tokens IS 'EPIC 25: Get all active FCM tokens for a user';

