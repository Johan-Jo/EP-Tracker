import { messaging } from './firebase-admin';
import { createClient } from '@/lib/supabase/server';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  url: string;
  data?: Record<string, string>;
  tag?: string; // Optional tag for grouping/replacing notifications
  skipQuietHours?: boolean; // Skip quiet hours check (e.g., for test notifications)
}

/**
 * Send a push notification to a user
 */
export async function sendNotification(payload: NotificationPayload) {
  console.log(`🔔 [sendNotification] Starting for user ${payload.userId}, type: ${payload.type}`);
  
  if (!messaging) {
    console.warn('⚠️ Firebase messaging not available - notification not sent');
    return null;
  }

  try {
    const supabase = await createClient();
    console.log(`🔔 [sendNotification] Supabase client created`);

    // 1. Check user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.userId)
      .single();

    console.log(`🔔 [sendNotification] User preferences:`, prefs);

    // Check if notification type is enabled
    const prefKey = getPreferenceKey(payload.type);
    if (prefs && prefKey && !prefs[prefKey]) {
      console.log(`⏭️ Notification ${payload.type} disabled for user ${payload.userId}`);
      return null;
    }

    // 2. Check quiet hours (unless skipQuietHours is true)
    if (!payload.skipQuietHours && prefs && isInQuietHours(prefs)) {
      console.log(`🔇 In quiet hours, skipping notification`);
      return null;
    }

    // 3. Get FCM tokens
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', payload.userId);

    console.log(`🔔 [sendNotification] Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`📭 No subscriptions for user ${payload.userId}`);
      return null;
    }

    // 4. Send to all devices
    const tokens = subscriptions.map((s) => s.fcm_token);
    console.log(`🔔 [sendNotification] Preparing to send to ${tokens.length} tokens`);
    
    const message: {
      notification: { title: string; body: string };
      data: Record<string, string>;
      tokens: string[];
      webpush?: { notification: { tag: string } };
    } = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url,
        type: payload.type,
        ...(payload.data || {}),
      },
      tokens,
    };

    // Add tag for web push (grouping/replacing notifications)
    if (payload.tag) {
      message.webpush = {
        notification: {
          tag: payload.tag,
        },
      };
    }

    console.log(`🔔 [sendNotification] Calling Firebase sendEachForMulticast...`);
    const response = await messaging.sendEachForMulticast(message);
    console.log(`🔔 [sendNotification] Firebase response:`, JSON.stringify({
      successCount: response.successCount,
      failureCount: response.failureCount,
    }));

    // Log failures if any
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Failed to send to token ${idx}:`, resp.error);
        }
      });
    }

    // 5. Log notification
    await supabase.from('notification_log').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });

    console.log(`✅ Sent notification to ${response.successCount}/${tokens.length} devices`);

    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return null;
  }
}

/**
 * Map notification type to preference key
 */
function getPreferenceKey(type: string): string | null {
  const mapping: Record<string, string> = {
    checkout_reminder: 'checkout_reminders',
    team_checkin: 'team_checkins',
    team_checkout: 'team_checkins',
    approval_needed: 'approvals_needed',
    approval_confirmed: 'approval_confirmed',
    ata_update: 'ata_updates',
    diary_update: 'diary_updates',
    weekly_summary: 'weekly_summary',
  };
  return mapping[type] || null;
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(prefs: { quiet_hours_start?: string; quiet_hours_end?: string }): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

  const [startHour, startMinute] = prefs.quiet_hours_start.split(':').map(Number);
  const [endHour, endMinute] = prefs.quiet_hours_end.split(':').map(Number);

  const quietStart = startHour * 60 + startMinute;
  const quietEnd = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (quietStart > quietEnd) {
    return currentTime >= quietStart || currentTime < quietEnd;
  }

  // Handle same-day quiet hours (e.g., 12:00 to 14:00)
  return currentTime >= quietStart && currentTime < quietEnd;
}

