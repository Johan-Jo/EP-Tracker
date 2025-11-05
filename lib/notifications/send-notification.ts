import { messaging } from './firebase-admin';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  url: string;
  data?: Record<string, string>;
  tag?: string; // Optional tag for grouping/replacing notifications
  skipQuietHours?: boolean; // Skip quiet hours check (e.g., for test notifications)
  orgId?: string; // Organization ID for logging (optional)
}

/**
 * Send a push notification to a user
 */
export async function sendNotification(payload: NotificationPayload) {
  console.error(`🔔 [sendNotification] Starting for user ${payload.userId}, type: ${payload.type}`);
  
  // Use admin client to bypass RLS when reading preferences and subscriptions
  const adminClient = createAdminClient();
  console.error(`🔔 [sendNotification] Admin client created`);

  // 1. Check user preferences (use admin client to bypass RLS)
  const { data: prefs, error: prefsError } = await adminClient
    .from('notification_preferences')
    .select('*')
    .eq('user_id', payload.userId)
    .single();

  if (prefsError && prefsError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`❌ Error fetching preferences:`, prefsError);
  }

  console.error(`🔔 [sendNotification] User preferences:`, prefs);

  // Check global enabled flag (default to true if no preferences exist)
  if (prefs && prefs.enabled === false) {
    console.error(`⏭️ Notifications globally disabled for user ${payload.userId}`);
    return null;
  }

  // Check if notification type is enabled (default to true if no preferences exist)
  const prefKey = getPreferenceKey(payload.type);
  if (prefs && prefKey && prefs[prefKey] === false) {
    console.error(`⏭️ Notification ${payload.type} disabled for user ${payload.userId} (prefKey: ${prefKey})`);
    return null;
  }

  // 2. Check quiet hours (unless skipQuietHours is true)
  if (!payload.skipQuietHours && prefs && isInQuietHours(prefs)) {
    console.error(`🔇 In quiet hours, skipping notification`);
    return null;
  }

  // 3. Get FCM tokens (try Firebase first if available) - use admin client to bypass RLS
  const { data: subscriptions, error: subsError } = await adminClient
    .from('push_subscriptions')
    .select('fcm_token')
    .eq('user_id', payload.userId)
    .eq('is_active', true);

  if (subsError) {
    console.error(`❌ Error fetching subscriptions:`, subsError);
  }

  console.error(`🔔 [sendNotification] Found ${subscriptions?.length || 0} subscriptions`);

  // Try Firebase first if available and has tokens
  if (messaging && subscriptions && subscriptions.length > 0) {
    try {
      // 4. Send to all devices via Firebase
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

      // Log notification (use admin client to bypass RLS)
      if (payload.orgId) {
        const adminClient = createAdminClient();
        // Try with org_id first, fallback to without if column doesn't exist
        let logData: any = {
          user_id: payload.userId,
          org_id: payload.orgId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          status: 'sent',
          project_id: payload.data?.projectId || null,
        };
        let { error: logError } = await adminClient.from('notification_log').insert(logData);
        
        // If org_id column doesn't exist, try without it
        if (logError && logError.code === 'PGRST204' && logError.message?.includes('org_id')) {
          const { org_id, ...logDataWithoutOrgId } = logData;
          ({ error: logError } = await adminClient.from('notification_log').insert(logDataWithoutOrgId));
        }
        
        if (logError) {
          console.error('❌ Failed to log notification:', logError);
        }
      }

      console.log(`✅ Sent notification to ${response.successCount}/${tokens.length} devices via Firebase`);
      return response;
    } catch (error) {
      console.error('❌ Error sending Firebase notification, falling back to email:', error);
    }
  }

  // Fallback to email if Firebase is not available or no tokens
  console.error(`📧 Firebase not available or no tokens - sending via email instead`);
  console.error(`📧 Firebase available: ${!!messaging}, Has tokens: ${subscriptions?.length || 0}`);
  
  try {
    // Get user's email from profile - use admin client to bypass RLS
    console.error(`📧 Fetching profile for user ${payload.userId}`);
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', payload.userId)
      .single();

    if (profileError || !profile?.email) {
      console.error('❌ Could not find user email:', profileError);
      console.error('❌ Profile data:', profile);
      return null;
    }

    console.error(`📧 Found profile email: ${profile.email}`);

    // Build email content
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eptracker.app';
    const notificationUrl = payload.url.startsWith('http') ? payload.url : `${baseUrl}${payload.url}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 EP-Tracker Notifikation</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0; font-size: 20px;">${payload.title}</h2>
            <p style="color: #4b5563; font-size: 16px; white-space: pre-wrap;">${payload.body}</p>
            ${payload.url ? `
              <div style="margin-top: 30px; text-align: center;">
                <a href="${notificationUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Öppna i EP-Tracker</a>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
              Detta är en automatisk notifikation från EP-Tracker.<br>
              Du får detta meddelande via e-post eftersom push-notifikationer inte är tillgängliga just nu.
            </p>
          </div>
        </body>
      </html>
    `;

    // Check RESEND_API_KEY before attempting to send
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_placeholder_key') {
      console.error(`❌ [sendNotification] RESEND_API_KEY not set! Cannot send email.`);
      console.error(`❌ [sendNotification] API Key value: ${apiKey ? 'set but placeholder' : 'not set'}`);
      return null;
    }

    // Send email via Resend
    console.error(`📧 Sending email to ${profile.email} via Resend...`);
    console.error(`📧 RESEND_API_KEY is set: ${!!apiKey}`);
    const emailResult = await sendEmail({
      to: profile.email,
      toName: profile.full_name || undefined,
      subject: `🔔 ${payload.title}`,
      template: 'custom',
      templateData: {
        html: emailHtml,
      },
      emailType: 'notification',
    });

    console.error(`📧 Email send result:`, { success: emailResult.success, error: emailResult.error, messageId: emailResult.messageId });

    if (!emailResult.success) {
      console.error('❌ Failed to send notification email:', emailResult.error);
      return null;
    }

    // Log notification (use admin client to bypass RLS)
    if (payload.orgId) {
      const adminClient = createAdminClient();
      // Try with org_id first, fallback to without if column doesn't exist
      let logData: any = {
        user_id: payload.userId,
        org_id: payload.orgId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.success ? null : emailResult.error,
        project_id: payload.data?.projectId || null,
      };
      let { error: logError } = await adminClient.from('notification_log').insert(logData);
      
      // If org_id column doesn't exist, try without it
      if (logError && logError.code === 'PGRST204' && logError.message?.includes('org_id')) {
        const { org_id, ...logDataWithoutOrgId } = logData;
        ({ error: logError } = await adminClient.from('notification_log').insert(logDataWithoutOrgId));
      }
      
      if (logError) {
        console.error('❌ Failed to log notification:', logError);
      }
    }

    console.error(`✅ Sent notification via email to ${profile.email}`);
    return { success: true, method: 'email', messageId: emailResult.messageId };
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    return null;
  }
}

/**
 * Map notification type to preference key
 */
function getPreferenceKey(type: string): string | null {
  const mapping: Record<string, string> = {
    checkout_reminder: 'checkout_reminders',
    team_checkin: 'team_checkin', // Matches database column name (singular)
    team_checkout: 'team_checkin', // Uses same preference as team_checkin
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

