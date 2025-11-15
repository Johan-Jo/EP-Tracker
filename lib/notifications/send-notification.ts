/**
 * Core notification sending service
 * Handles preference checking, quiet hours, and FCM delivery
 */

import { getMessaging } from './firebase-admin';
import { createClient } from '@/lib/supabase/server';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  url: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
}

export interface SendNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

/**
 * Map notification types to preference keys
 */
function getPreferenceKey(type: string): string {
  const typeMap: Record<string, string> = {
    checkout_reminder: 'checkout_reminders',
    team_checkin: 'team_checkins',
    team_checkout: 'team_checkins',
    approval_needed: 'approvals_needed',
    approval_confirmed: 'approval_confirmed',
    ata_update: 'ata_updates',
    diary_update: 'diary_updates',
    weekly_summary: 'weekly_summary',
    project_checkin_reminder: 'project_checkin_reminders',
    project_checkout_reminder: 'project_checkout_reminders',
  };

  return typeMap[type] || type;
}

/**
 * Check if current time is within user's quiet hours
 */
async function isInQuietHours(userId: string, supabase: any): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_in_quiet_hours', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[Notifications] Error checking quiet hours:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('[Notifications] Exception checking quiet hours:', error);
    return false;
  }
}

/**
 * Main function to send a push notification
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<SendNotificationResult> {
  const result: SendNotificationResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    const supabase = await createClient();
    const messaging = getMessaging();

    if (!messaging) {
      console.error('[Notifications] Firebase not configured');
      result.errors?.push('Firebase not configured');
      return result;
    }

    // 1. Check user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.userId)
      .maybeSingle();

    // Check if notification type is enabled (default to true if no prefs)
    const prefKey = getPreferenceKey(payload.type);
    if (prefs && prefs[prefKey] === false) {
      console.log(`[Notifications] Type ${payload.type} disabled for user ${payload.userId}`);
      return result;
    }

    // 2. Check quiet hours
    const inQuietHours = await isInQuietHours(payload.userId, supabase);
    if (inQuietHours) {
      console.log(`[Notifications] User ${payload.userId} in quiet hours, skipping`);
      return result;
    }

    // 3. Get FCM tokens
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('fcm_token, id')
      .eq('user_id', payload.userId)
      .eq('is_active', true);

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[Notifications] No active subscriptions for user ${payload.userId}`);
      return result;
    }

    const tokens = subscriptions.map((s) => s.fcm_token);

    // 4. Send notification via FCM
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/images/faviconEP.png',
      },
      data: {
        url: payload.url,
        type: payload.type,
        ...payload.data,
      },
      tokens,
    };

    try {
      const response = await messaging.sendEachForMulticast(message);

      result.sent = response.successCount;
      result.failed = response.failureCount;
      result.success = response.successCount > 0;

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            result.errors?.push(resp.error?.message || 'Unknown error');
          }
        });

        // Deactivate failed tokens
        if (failedTokens.length > 0) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .in('fcm_token', failedTokens);
        }
      }

      console.log(
        `[Notifications] Sent to ${result.sent}/${tokens.length} devices for user ${payload.userId}`
      );
    } catch (error: any) {
      console.error('[Notifications] FCM send error:', error);
      result.errors?.push(error.message || 'FCM send failed');
      return result;
    }

    // 5. Log notification
    await supabase.from('notification_log').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      delivery_status: result.success ? 'sent' : 'failed',
      error_message: result.errors && result.errors.length > 0 ? result.errors.join(', ') : null,
    });

    return result;
  } catch (error: any) {
    console.error('[Notifications] Unexpected error:', error);
    result.errors?.push(error.message || 'Unexpected error');
    return result;
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendNotificationToMultipleUsers(
  userIds: string[],
  payload: Omit<NotificationPayload, 'userId'>
): Promise<SendNotificationResult[]> {
  const results = await Promise.all(
    userIds.map((userId) =>
      sendNotification({
        ...payload,
        userId,
      })
    )
  );

  return results;
}

