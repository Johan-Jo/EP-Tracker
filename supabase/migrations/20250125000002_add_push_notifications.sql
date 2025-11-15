-- Migration: Add Push Notifications Support
-- Epic 25: Web Push Notifications
-- Created: 2025-01-25

-- =====================================================
-- PUSH SUBSCRIPTIONS TABLE
-- Stores FCM tokens for each user's devices
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  device_type TEXT CHECK (device_type IN ('android', 'ios', 'desktop', 'unknown')),
  device_name TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index for faster user lookups
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id) WHERE is_active = true;
CREATE INDEX idx_push_subs_token ON push_subscriptions(fcm_token) WHERE is_active = true;

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- User preferences for different notification types
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- General notification types
  checkout_reminders BOOLEAN DEFAULT true,
  team_checkins BOOLEAN DEFAULT true,
  approvals_needed BOOLEAN DEFAULT true,
  approval_confirmed BOOLEAN DEFAULT true,
  ata_updates BOOLEAN DEFAULT true,
  diary_updates BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  
  -- Project-specific alerts
  project_checkin_reminders BOOLEAN DEFAULT true,
  project_checkout_reminders BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- =====================================================
-- NOTIFICATION LOG TABLE
-- History of all sent notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Delivery info
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'clicked')),
  error_message TEXT,
  
  -- User interaction
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX idx_notif_log_user_sent ON notification_log(user_id, sent_at DESC);
CREATE INDEX idx_notif_log_type_sent ON notification_log(type, sent_at DESC);
CREATE INDEX idx_notif_log_user_unread ON notification_log(user_id, read_at) WHERE read_at IS NULL;

-- =====================================================
-- ADD ALERT_SETTINGS TO PROJECTS TABLE
-- Project-specific notification settings
-- =====================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS alert_settings JSONB DEFAULT '{
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

-- Index for projects with alerts enabled
CREATE INDEX idx_projects_alerts ON projects USING GIN (alert_settings) 
  WHERE (alert_settings->>'checkin_reminder_enabled')::boolean = true 
     OR (alert_settings->>'checkout_reminder_enabled')::boolean = true
     OR (alert_settings->>'late_checkin_alert_enabled')::boolean = true
     OR (alert_settings->>'forgotten_checkout_alert_enabled')::boolean = true;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all notification tables
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Push Subscriptions Policies
CREATE POLICY "Users can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Notification Preferences Policies
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Notification Log Policies
CREATE POLICY "Users can view their own notification log"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification log"
  ON notification_log FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_log
  WHERE sent_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notification_log
    WHERE user_id = p_user_id
    AND read_at IS NULL
    AND sent_at > NOW() - INTERVAL '7 days'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_log
  SET read_at = NOW(),
      delivery_status = 'delivered'
  WHERE id = p_notification_id
  AND user_id = p_user_id
  AND read_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as clicked
CREATE OR REPLACE FUNCTION mark_notification_clicked(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_log
  SET clicked_at = NOW(),
      read_at = COALESCE(read_at, NOW()),
      delivery_status = 'clicked'
  WHERE id = p_notification_id
  AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is in quiet hours
CREATE OR REPLACE FUNCTION is_in_quiet_hours(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  prefs RECORD;
  current_time TIME;
BEGIN
  SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end
  INTO prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND OR NOT prefs.quiet_hours_enabled THEN
    RETURN false;
  END IF;
  
  current_time := LOCALTIME;
  
  -- Handle quiet hours that span midnight
  IF prefs.quiet_hours_start > prefs.quiet_hours_end THEN
    RETURN current_time >= prefs.quiet_hours_start OR current_time < prefs.quiet_hours_end;
  ELSE
    RETURN current_time >= prefs.quiet_hours_start AND current_time < prefs.quiet_hours_end;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS
-- =====================================================

-- Grant authenticated users access to notification tables
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, UPDATE ON notification_log TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_clicked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_quiet_hours(UUID) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE push_subscriptions IS 'Stores FCM tokens for push notifications per user device';
COMMENT ON TABLE notification_preferences IS 'User preferences for different types of notifications';
COMMENT ON TABLE notification_log IS 'History of all sent notifications with delivery status';
COMMENT ON COLUMN projects.alert_settings IS 'Project-specific alert configuration for check-ins and check-outs';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Deletes notification_log entries older than 30 days';
COMMENT ON FUNCTION is_in_quiet_hours(UUID) IS 'Checks if current time is within users quiet hours';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

