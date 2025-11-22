/**
 * Core notification sending service
 * Handles preference checking, quiet hours, FCM delivery, and email delivery
 */

import { getMessaging } from './firebase-admin';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  url: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  skipQuietHours?: boolean; // For project-alerts compatibility
  orgId?: string; // For project-alerts compatibility
  tag?: string; // For project-alerts compatibility
}

export interface SendNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
  method?: 'push' | 'email' | 'both'; // For project-alerts compatibility
  messageId?: string; // For email messageId
  pushResult?: { sent: number; failed: number };
  emailResult?: { success: boolean; messageId?: string; error?: string };
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
    forgotten_checkout_alert: 'forgotten_checkout_alert', // Specific type for forgotten checkout alerts
    reminder: 'project_checkin_reminders', // Generic reminder (used by project-alerts for check-in reminders)
    alert: 'project_checkout_reminders', // Generic alert (used by project-alerts for late check-in/forgotten checkout)
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
 * Send email notification using announcement template
 */
async function sendEmailNotification(
  payload: NotificationPayload,
  supabase: any,
  organizationName?: string
): Promise<{ success: boolean; messageId?: string; error?: string } | null> {
  try {
    console.log(`[Notifications] sendEmailNotification called for user ${payload.userId}`);
    
    // Get user email using admin client
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(payload.userId);
    
    let userEmail: string | undefined;
    let userName: string | undefined;

    if (!userError && userData?.user?.email) {
      userEmail = userData.user.email;
      userName = userData.user.user_metadata?.full_name || organizationName;
      console.log(`[Notifications] Found email via auth.admin: ${userEmail}`);
    } else {
      console.log(`[Notifications] Auth.admin failed, trying profiles table. Error:`, userError);
      // Fallback: try profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', payload.userId)
        .maybeSingle();
      
      if (profileError) {
        console.error(`[Notifications] Error fetching profile:`, profileError);
      }
      
      if (profile?.email) {
        userEmail = profile.email;
        userName = profile.full_name || organizationName;
        console.log(`[Notifications] Found email via profiles: ${userEmail}`);
      }
    }
    
    if (!userEmail) {
      console.warn(`[Notifications] No email found for user ${payload.userId}, skipping email`);
      return null;
    }
    
    console.log(`[Notifications] Sending email to ${userEmail} with subject: ${payload.title}`);

    // Build email URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eptracker.app';
    const emailUrl = `${baseUrl}${payload.url}`;

    // Use announcement template for notifications
    const emailResult = await sendEmail({
      to: userEmail,
      toName: userName,
      subject: payload.title,
      template: 'announcement',
      templateData: {
        organizationName: userName || 'Användare',
        subject: payload.title,
        message: payload.body,
        ctaText: 'Öppna i EP-Tracker',
        ctaUrl: emailUrl,
      },
      organizationId: payload.orgId,
      emailType: 'notification',
    });

    if (emailResult.success) {
      return {
        success: true,
        messageId: emailResult.messageId,
      };
    } else {
      return {
        success: false,
        error: emailResult.error || 'Unknown error',
      };
    }
  } catch (error: any) {
    console.error('[Notifications] Email send error:', error);
    return {
      success: false,
      error: error.message || 'Email send failed',
    };
  }
}

/**
 * Main function to send a notification (push, email, or both)
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
    // Use admin client to bypass RLS when logging notifications
    const supabase = createAdminClient();

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

    // 2. Get delivery method from preferences
    const defaultDeliveryMethods: Record<string, string> = {
      checkout_reminders: 'push',
      team_checkins: 'push',
      approvals_needed: 'push',
      approval_confirmed: 'push',
      ata_updates: 'push',
      diary_updates: 'push',
      weekly_summary: 'push',
      project_checkin_reminders: 'push',
      project_checkout_reminders: 'push',
      forgotten_checkout_alert: 'both', // Default to both for forgotten checkout alerts (operational alerts)
    };

    // Merge user's delivery_methods with defaults (user preferences override defaults)
    const userDeliveryMethods = prefs?.delivery_methods || {};
    const deliveryMethods = { ...defaultDeliveryMethods, ...userDeliveryMethods };
    
    // Get delivery method: use user's preference if set, otherwise use default, otherwise fallback to 'push'
    let deliveryMethod = (deliveryMethods[prefKey] || defaultDeliveryMethods[prefKey] || 'push') as 'push' | 'email' | 'both';
    
    console.error(`[Notifications] Delivery method lookup: prefKey=${prefKey}, deliveryMethods[prefKey]=${deliveryMethods[prefKey]}, defaultDeliveryMethods[prefKey]=${defaultDeliveryMethods[prefKey]}, final=${deliveryMethod}`);
    
    // Override: If this is a forgotten_checkout_alert, always use 'both' to ensure email is sent
    // This ensures operational alerts always send email even if user hasn't configured it
    if (payload.type === 'forgotten_checkout_alert') {
      if (deliveryMethod === 'push') {
        console.error(`[Notifications] Overriding deliveryMethod for forgotten_checkout_alert from 'push' to 'both'`);
        deliveryMethod = 'both';
      } else {
        console.error(`[Notifications] forgotten_checkout_alert deliveryMethod is already '${deliveryMethod}', keeping it`);
      }
    }

    console.error(`[Notifications] Sending ${payload.type} to user ${payload.userId}:`, {
      prefKey,
      deliveryMethod,
      enabled: prefs ? prefs[prefKey] !== false : 'default (true)',
      deliveryMethods: JSON.stringify(deliveryMethods),
      prefsDeliveryMethods: prefs?.delivery_methods ? JSON.stringify(prefs.delivery_methods) : 'null',
      defaultForPrefKey: defaultDeliveryMethods[prefKey],
    });

    // 3. Get organization name for email (if orgId is provided)
    let organizationName: string | undefined;
    if (payload.orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', payload.orgId)
        .maybeSingle();
      organizationName = org?.name;
    }

    // 4. Send push notification if method is 'push' or 'both'
    let pushSuccess = false;
    let pushSent = 0;
    let pushFailed = 0;

    if (deliveryMethod === 'push' || deliveryMethod === 'both') {
      console.log(`[Notifications] Attempting to send push to user ${payload.userId} (deliveryMethod: ${deliveryMethod})`);
      const messaging = getMessaging();
      if (messaging) {
        console.log(`[Notifications] Firebase messaging initialized for user ${payload.userId}`);
        // Check quiet hours for push (unless skipQuietHours is true)
        const inQuietHours = payload.skipQuietHours ? false : await isInQuietHours(payload.userId, supabase);
        console.log(`[Notifications] Quiet hours check for user ${payload.userId}: ${inQuietHours ? 'in quiet hours' : 'not in quiet hours'}`);
        
        if (!inQuietHours) {
          // Get FCM tokens
          const { data: subscriptions, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('fcm_token, id')
            .eq('user_id', payload.userId)
            .eq('is_active', true);

          if (subsError) {
            console.error(`[Notifications] Error fetching subscriptions for user ${payload.userId}:`, subsError);
          }

          console.log(`[Notifications] Found ${subscriptions?.length || 0} active subscriptions for user ${payload.userId}`);

          if (subscriptions && subscriptions.length > 0) {
            const tokens = subscriptions.map((s) => s.fcm_token);

            // Send notification via FCM
            // Note: Firebase Admin SDK doesn't support 'icon' in notification object
            // Use webpush.notification for web-specific options
            const message = {
              notification: {
                title: payload.title,
                body: payload.body,
              },
              webpush: {
                notification: {
                  icon: '/images/faviconEP.png',
                  badge: '/images/faviconEP.png',
                },
              },
              data: {
                url: payload.url,
                type: payload.type,
                tag: payload.tag || payload.data?.type || 'ep-tracker-notification', // Include tag in data for service worker
                icon: '/images/faviconEP.png', // Also include in data for service worker
                // Convert all data values to strings (Firebase requirement)
                ...Object.fromEntries(
                  Object.entries(payload.data || {}).map(([key, value]) => [
                    key,
                    typeof value === 'string' ? value : JSON.stringify(value),
                  ])
                ),
              },
              tokens,
            };

            try {
              console.log(`[Notifications] Sending push to ${tokens.length} tokens for user ${payload.userId}`);
              const response = await messaging.sendEachForMulticast(message);

              pushSent = response.successCount;
              pushFailed = response.failureCount;
              pushSuccess = response.successCount > 0;

              console.log(`[Notifications] Push response for user ${payload.userId}: successCount=${response.successCount}, failureCount=${response.failureCount}`);

              // Handle failed tokens
              if (response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                  if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                    const errorMsg = resp.error?.message || resp.error?.code || 'Unknown error';
                    result.errors?.push(errorMsg);
                    console.error(`[Notifications] Failed to send to token ${tokens[idx].substring(0, 20)}...:`, errorMsg);
                  }
                });

                // Deactivate failed tokens (only for permanent errors)
                if (failedTokens.length > 0) {
                  const permanentErrors = ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'];
                  const tokensToDeactivate: string[] = [];
                  
                  response.responses.forEach((resp, idx) => {
                    if (!resp.success && resp.error?.code && permanentErrors.includes(resp.error.code)) {
                      tokensToDeactivate.push(tokens[idx]);
                    }
                  });

                  if (tokensToDeactivate.length > 0) {
                    await supabase
                      .from('push_subscriptions')
                      .update({ is_active: false })
                      .in('fcm_token', tokensToDeactivate);
                    console.log(`[Notifications] Deactivated ${tokensToDeactivate.length} invalid tokens`);
                  }
                }
              }

              console.log(
                `[Notifications] Push sent to ${pushSent}/${tokens.length} devices for user ${payload.userId}`
              );
            } catch (error: any) {
              console.error('[Notifications] FCM send error:', error);
              const errorMsg = error.message || error.code || 'FCM send failed';
              result.errors?.push(errorMsg);
              // Log full error for debugging
              console.error('[Notifications] Full FCM error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
              });
            }
          } else {
            console.log(`[Notifications] ⚠️ No active subscriptions for user ${payload.userId}`);
            console.log(`[Notifications] 💡 User needs to enable push notifications at /dashboard/settings/notifications`);
            // If deliveryMethod is 'push' and no subscriptions, fallback to email
            if (deliveryMethod === 'push') {
              console.log(`[Notifications] 📧 Fallback to email for user ${payload.userId} (no push subscriptions - user needs to enable push notifications)`);
            }
          }
        } else {
          console.log(`[Notifications] User ${payload.userId} in quiet hours, skipping push`);
          // If deliveryMethod is 'push' and in quiet hours, fallback to email
          if (deliveryMethod === 'push') {
            console.log(`[Notifications] Fallback to email for user ${payload.userId} (quiet hours)`);
          }
        }
      } else {
        console.warn(`[Notifications] Firebase not configured for user ${payload.userId}, skipping push`);
        if (deliveryMethod === 'push') {
          console.log(`[Notifications] Fallback to email for user ${payload.userId} (Firebase not configured)`);
        }
      }
    } else {
      console.log(`[Notifications] Skipping push for user ${payload.userId} (deliveryMethod: ${deliveryMethod}, not 'push' or 'both')`);
    }

    // 5. Send email notification if method is 'email' or 'both', OR if push failed and method was 'push'
    let emailSuccess = false;
    let emailMessageId: string | undefined;
    const shouldSendEmail = 
      deliveryMethod === 'email' || 
      deliveryMethod === 'both' ||
      (deliveryMethod === 'push' && !pushSuccess);

    console.log(`[Notifications] Email decision for user ${payload.userId}:`, {
      deliveryMethod,
      pushSuccess,
      shouldSendEmail,
      prefKey,
      deliveryMethods: JSON.stringify(deliveryMethods),
    });

    if (shouldSendEmail) {
      console.log(`[Notifications] Attempting to send email to user ${payload.userId} (deliveryMethod: ${deliveryMethod}, pushSuccess: ${pushSuccess})`);
      try {
        const emailResult = await sendEmailNotification(payload, supabase, organizationName);
        
        if (emailResult) {
          emailSuccess = emailResult.success;
          emailMessageId = emailResult.messageId;
          result.emailResult = emailResult;
          
          if (!emailResult.success) {
            console.error(`[Notifications] Email send failed for user ${payload.userId}:`, emailResult.error);
            result.errors?.push(emailResult.error || 'Email send failed');
          } else {
            console.log(`[Notifications] ✅ Email sent to user ${payload.userId} (messageId: ${emailMessageId})`);
          }
        } else {
          console.warn(`[Notifications] Email notification returned null for user ${payload.userId} (no email found or error)`);
          result.errors?.push('Email notification returned null (no email found)');
        }
      } catch (error: any) {
        console.error(`[Notifications] Exception in sendEmailNotification for user ${payload.userId}:`, error);
        result.errors?.push(error.message || 'Email send exception');
      }
    } else {
      console.log(`[Notifications] Skipping email for user ${payload.userId} (deliveryMethod: ${deliveryMethod}, pushSuccess: ${pushSuccess})`);
    }

    // 6. Combine results
    if (deliveryMethod === 'both') {
      result.success = pushSuccess || emailSuccess;
      result.sent = pushSent + (emailSuccess ? 1 : 0);
      result.failed = pushFailed + (emailSuccess ? 0 : 1);
      result.method = 'both';
    } else if (deliveryMethod === 'email') {
      result.success = emailSuccess;
      result.sent = emailSuccess ? 1 : 0;
      result.failed = emailSuccess ? 0 : 1;
      result.method = 'email';
    } else {
      // deliveryMethod === 'push'
      // If push failed but email succeeded (fallback), use email result
      if (!pushSuccess && emailSuccess) {
        result.success = true;
        result.sent = 1;
        result.failed = 0;
        result.method = 'email'; // Changed from push to email due to fallback
      } else {
        result.success = pushSuccess;
        result.sent = pushSent;
        result.failed = pushFailed;
        result.method = 'push';
      }
    }

    result.pushResult = { sent: pushSent, failed: pushFailed };
    result.messageId = emailMessageId;

    // Log final result
    console.log(`[Notifications] Final result for user ${payload.userId}: success=${result.success}, method=${result.method}, sent=${result.sent}, failed=${result.failed}, pushSuccess=${pushSuccess}, emailSuccess=${emailSuccess}`);

    // 7. Log notification
    try {
      const { error: logError } = await supabase.from('notification_log').insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: {
          ...(payload.data || {}),
          delivery_method: result.method,
          email_message_id: emailMessageId,
        },
        delivery_status: result.success ? 'sent' : 'failed',
        error_message: result.errors && result.errors.length > 0 ? result.errors.join(', ') : null,
      });

      if (logError) {
        console.error(`[Notifications] ❌ Failed to log notification to database:`, logError);
        console.error(`[Notifications] Log error details:`, JSON.stringify(logError, null, 2));
      } else {
        console.error(`[Notifications] ✅ Logged notification to database for user ${payload.userId}, type: ${payload.type}`);
      }
    } catch (logErr: any) {
      console.error(`[Notifications] ❌ Exception while logging notification:`, logErr);
      console.error(`[Notifications] Log exception stack:`, logErr?.stack);
    }

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
  console.log(`[Notifications] sendNotificationToMultipleUsers: Sending ${payload.type} to ${userIds.length} users`);
  
  const results = await Promise.all(
    userIds.map(async (userId) => {
      console.log(`[Notifications] sendNotificationToMultipleUsers: Calling sendNotification for user ${userId.substring(0, 8)}...`);
      const result = await sendNotification({
        ...payload,
        userId,
      });
      console.log(`[Notifications] sendNotificationToMultipleUsers: Result for user ${userId.substring(0, 8)}...: success=${result.success}, method=${result.method}`);
      return result;
    })
  );

  const successCount = results.filter(r => r.success).length;
  console.log(`[Notifications] sendNotificationToMultipleUsers: Completed. ${successCount}/${userIds.length} succeeded`);
  
  return results;
}

