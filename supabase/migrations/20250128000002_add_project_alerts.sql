-- Migration: Add project alert settings
-- Epic 25 Phase 2: Project-Specific Alerts
-- Created: 2025-01-28

-- Add alert_settings column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS alert_settings JSONB DEFAULT '{"work_day_start":"07:00","work_day_end":"16:00","notify_on_checkin":true,"notify_on_checkout":true,"checkin_reminder_enabled":false,"checkin_reminder_minutes_before":15,"checkout_reminder_enabled":false,"checkout_reminder_minutes_before":15,"late_checkin_enabled":false,"late_checkin_minutes_after":15,"forgotten_checkout_enabled":false,"forgotten_checkout_minutes_after":30,"alert_recipients":["admin","foreman"]}'::jsonb;

-- Add comment
COMMENT ON COLUMN projects.alert_settings IS 'Project-specific alert configuration for check-in/out notifications';

-- Create index for faster queries on alert settings
CREATE INDEX IF NOT EXISTS idx_projects_alert_settings 
ON projects USING gin (alert_settings);

-- Update existing projects with default alert settings (only if NULL)
UPDATE projects 
SET alert_settings = '{"work_day_start":"07:00","work_day_end":"16:00","notify_on_checkin":true,"notify_on_checkout":true,"checkin_reminder_enabled":false,"checkin_reminder_minutes_before":15,"checkout_reminder_enabled":false,"checkout_reminder_minutes_before":15,"late_checkin_enabled":false,"late_checkin_minutes_after":15,"forgotten_checkout_enabled":false,"forgotten_checkout_minutes_after":30,"alert_recipients":["admin","foreman"]}'::jsonb
WHERE alert_settings IS NULL;
