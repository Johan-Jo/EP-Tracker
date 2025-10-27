# EPIC 25: Web Push Notifications - Deployment Guide

## Overview
This guide covers the deployment steps for EPIC 25 - Web Push Notifications feature.

## Prerequisites
- Firebase Project created
- Service account key generated
- Environment variables configured

## Environment Variables Required

### Vercel Environment Variables
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### How to Get These Values
1. Go to Firebase Console > Project Settings
2. Navigate to Service Accounts tab
3. Click "Generate New Private Key"
4. Download the JSON file
5. Extract the values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)

## Database Migrations

### 1. Push Notification Tables
```bash
# Already included in supabase/migrations/20250125000002_add_push_notifications.sql
```

This creates:
- `push_subscriptions` - Stores FCM tokens
- `notification_preferences` - User notification settings
- `notification_log` - History of sent notifications

### 2. Project Alert Settings
```sql
ALTER TABLE projects ADD COLUMN alert_settings JSONB DEFAULT '{
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
```

## Deployment Steps

### 1. Backend Setup
1. Add environment variables to Vercel
2. Deploy the application
3. Verify Firebase Admin SDK initialization:
   ```bash
   curl https://your-app.vercel.app/api/notifications/test
   ```

### 2. Database Setup
1. Run migrations in Supabase SQL Editor:
   - `20250125000002_add_push_notifications.sql`
2. Verify tables were created:
   ```sql
   SELECT * FROM push_subscriptions LIMIT 1;
   SELECT * FROM notification_preferences LIMIT 1;
   SELECT * FROM notification_log LIMIT 1;
   ```

### 3. Cron Jobs Setup
Vercel cron jobs are configured in `vercel.json`:
- Checkout reminders: Every 15 minutes during work hours
- Weekly approval summaries: Every Monday at 08:00

### 4. Frontend Setup
No additional setup required - PWA manifest and service workers are automatically deployed.

## Testing

### 1. Test Notification Permission
1. Log in to the application
2. Go to Settings > Notifications
3. Click "Aktivera notifikationer"
4. Accept browser permission prompt
5. Verify FCM token is stored in database

### 2. Test Push Notification
1. Use the test endpoint:
   ```bash
   curl -X POST https://your-app.vercel.app/api/notifications/test \
     -H "Content-Type: application/json" \
     -d '{"userId": "user-uuid"}'
   ```
2. Verify notification appears on device

### 3. Test Project Alerts
1. Create a project with alert settings
2. Check in/out as a worker
3. Verify foreman/admin receives notifications

## Rollback Plan

### Emergency Disable
If notifications cause issues, disable them quickly:

```sql
-- Disable all notification preferences
UPDATE notification_preferences 
SET enabled = false;

-- Clear all FCM tokens (prevents new notifications)
DELETE FROM push_subscriptions;
```

### Full Rollback
1. Remove environment variables from Vercel
2. Roll back database migrations (if needed):
   ```sql
   DROP TABLE notification_log;
   DROP TABLE notification_preferences;
   DROP TABLE push_subscriptions;
   ALTER TABLE projects DROP COLUMN alert_settings;
   ```

## Monitoring

### Key Metrics to Watch
1. **FCM Token Registration Rate**
   ```sql
   SELECT COUNT(*) FROM push_subscriptions;
   ```

2. **Notification Success Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM notification_log
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

3. **User Preferences**
   ```sql
   SELECT 
     enabled,
     COUNT(*) as count
   FROM notification_preferences
   GROUP BY enabled;
   ```

### Error Monitoring
Check for common issues:
- Firebase Admin SDK initialization failures
- FCM token expiration/invalidity
- RLS policy violations

## Support

### Common Issues

#### 1. Notifications not sending
- Verify Firebase environment variables are set
- Check FCM token validity
- Verify user has granted browser permission

#### 2. Permission denied errors
- Check RLS policies on notification tables
- Verify user is authenticated

#### 3. Cron jobs not running
- Check Vercel cron logs
- Verify `CRON_SECRET` is configured

## Post-Deployment Checklist
- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] Test notification sent successfully
- [ ] Cron jobs verified in Vercel dashboard
- [ ] User documentation updated
- [ ] Interactive tour tested
- [ ] Mobile testing on iOS and Android
- [ ] Error monitoring configured
- [ ] Team trained on new features

## Resources
- Firebase Console: https://console.firebase.google.com
- FCM Documentation: https://firebase.google.com/docs/cloud-messaging
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs

