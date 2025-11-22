-- Migration: Add Email Notifications Support
-- Epic: Email Notifications Integration
-- Created: 2025-02-01

-- =====================================================
-- ADD DELIVERY_METHODS TO NOTIFICATION_PREFERENCES
-- Allows users to choose push, email, or both for each notification type
-- =====================================================

ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS delivery_methods JSONB DEFAULT '{
  "checkout_reminders": "push",
  "team_checkins": "push",
  "approvals_needed": "push",
  "approval_confirmed": "push",
  "ata_updates": "push",
  "diary_updates": "push",
  "weekly_summary": "push",
  "project_checkin_reminders": "push",
  "project_checkout_reminders": "push"
}'::jsonb;

-- Update existing rows with default delivery methods
UPDATE notification_preferences
SET delivery_methods = '{
  "checkout_reminders": "push",
  "team_checkins": "push",
  "approvals_needed": "push",
  "approval_confirmed": "push",
  "ata_updates": "push",
  "diary_updates": "push",
  "weekly_summary": "push",
  "project_checkin_reminders": "push",
  "project_checkout_reminders": "push"
}'::jsonb
WHERE delivery_methods IS NULL;

-- Add comment
COMMENT ON COLUMN notification_preferences.delivery_methods IS 'User preferences for notification delivery method per type. Values: "push", "email", or "both"';

-- =====================================================
-- END OF MIGRATION
-- =====================================================


