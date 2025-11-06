/**
 * Project Alert Notifications
 * Handles check-in/out and late/forgotten alerts for projects
 * Epic 25 Phase 2
 */

import { createClient } from '@/lib/supabase/server';
import { sendNotification } from './send-notification';

interface ProjectAlertSettings {
  work_day_start: string;
  work_day_end: string;
  notify_on_checkin: boolean;
  notify_on_checkout: boolean;
  checkin_reminder_enabled: boolean;
  checkin_reminder_minutes_before: number;
  checkin_reminder_for_workers?: boolean;
  checkin_reminder_for_foreman?: boolean;
  checkin_reminder_for_admin?: boolean;
  checkout_reminder_enabled: boolean;
  checkout_reminder_minutes_before: number;
  checkout_reminder_for_workers?: boolean;
  checkout_reminder_for_foreman?: boolean;
  checkout_reminder_for_admin?: boolean;
  late_checkin_enabled: boolean;
  late_checkin_minutes_after: number;
  forgotten_checkout_enabled: boolean;
  forgotten_checkout_minutes_after: number;
  alert_recipients: string[];
}

/**
 * Send check-in notification to admin/foreman
 */
export async function notifyOnCheckIn(params: {
  projectId: string;
  userId: string;
  userName: string;
  checkinTime: Date;
}) {
  const { projectId, userId, userName, checkinTime } = params;
  const supabase = await createClient();

  try {
    // Get project with alert settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, org_id, alert_settings')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project for check-in notification:', projectError);
      return;
    }

    const alertSettings = project.alert_settings as ProjectAlertSettings;

    // Check if check-in notifications are enabled
    if (!alertSettings?.notify_on_checkin) {
      return;
    }

    // Get admin and foreman users in the organization
    const rolesToCheck = alertSettings.alert_recipients || ['admin', 'foreman'];
    
    const { data: recipients, error: recipientsError } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', project.org_id)
      .eq('is_active', true)
      .in('role', rolesToCheck);

    if (recipientsError) {
      console.error('Error fetching recipients for check-in notification:', recipientsError);
      return;
    }
    
    if (!recipients || recipients.length === 0) {
      return;
    }

    // Format time
    const timeString = checkinTime.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send notification to each recipient
    let sentCount = 0;
    let failedCount = 0;
    const results: any[] = [];
    
    for (const recipient of recipients) {
      // Don't send to the person who checked in
      if (recipient.user_id === userId) {
        continue;
      }

      try {
        const result = await sendNotification({
          userId: recipient.user_id,
          type: 'team_checkin',
          title: `👷 ${userName} checkade in`,
          body: `På projekt: ${project.name}\nTid: ${timeString}`,
          url: `/dashboard/projects/${projectId}`,
          data: {
            projectId,
            userId,
            type: 'check_in',
          },
          tag: `checkin-${projectId}-${userId}`,
          orgId: project.org_id,
          skipQuietHours: true, // Team check-ins are operational alerts, should bypass quiet hours
        });
        
        // Determine method and messageId based on result type
        let method = 'unknown';
        let messageId: string | null = null;
        
        if (result) {
          // Check if it's an email result (has 'method' property)
          if ('method' in result && typeof result.method === 'string') {
            method = result.method;
            messageId = ('messageId' in result ? result.messageId : null) || null;
          } else {
            // It's a Firebase BatchResponse
            method = 'push';
            // BatchResponse doesn't have a single messageId, so we leave it null
          }
        }
        
        results.push({
          userId: recipient.user_id,
          result: result,
          success: !!result,
          method,
          messageId,
        });
        
        if (result) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error: any) {
        console.error('Error sending check-in notification:', error);
        results.push({
          userId: recipient.user_id,
          error: error.message,
          success: false,
        });
        failedCount++;
      }
    }
    
    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      results,
    };
  } catch (error) {
    console.error('Error in notifyOnCheckIn:', error);
  }
}

/**
 * Send check-out notification to admin/foreman
 */
export async function notifyOnCheckOut(params: {
  projectId: string;
  userId: string;
  userName: string;
  checkoutTime: Date;
  hoursWorked: number;
}) {
  const { projectId, userId, userName, checkoutTime, hoursWorked } = params;
  
  try {
    const supabase = await createClient();
    // Get project with alert settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, org_id, alert_settings')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project for check-out notification:', projectError);
      return;
    }

    const alertSettings = project.alert_settings as ProjectAlertSettings;

    // Check if check-out notifications are enabled
    if (!alertSettings?.notify_on_checkout) {
      return;
    }

    // Get admin and foreman users in the organization
    const rolesToCheck = alertSettings.alert_recipients || ['admin', 'foreman'];
    
    const { data: recipients, error: recipientsError } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', project.org_id)
      .eq('is_active', true)
      .in('role', rolesToCheck);

    if (recipientsError) {
      console.error('Error fetching recipients for check-out notification:', recipientsError);
      return;
    }

    if (!recipients || recipients.length === 0) {
      return;
    }

    // Format time
    const timeString = checkoutTime.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Format hours worked
    const hours = Math.floor(hoursWorked);
    const minutes = Math.round((hoursWorked - hours) * 60);
    const hoursString = `${hours}h ${minutes}min`;

    // Send notification to each recipient
    let sentCount = 0;
    let failedCount = 0;
    const results: any[] = [];
    
    for (const recipient of recipients) {
      // Don't send to the person who checked out
      if (recipient.user_id === userId) {
        continue;
      }

      try {
        const result = await sendNotification({
          userId: recipient.user_id,
          type: 'team_checkout',
          title: `🏠 ${userName} checkade ut`,
          body: `På projekt: ${project.name}\nTid: ${timeString}\nArbetat: ${hoursString}`,
          url: `/dashboard/projects/${projectId}`,
          data: {
            projectId,
            userId,
            type: 'check_out',
          },
          tag: `checkout-${projectId}-${userId}`,
          orgId: project.org_id,
          skipQuietHours: true, // Team check-outs are operational alerts, should bypass quiet hours
        });
        
        // Determine method and messageId based on result type
        let method = 'unknown';
        let messageId: string | null = null;
        
        if (result) {
          // Check if it's an email result (has 'method' property)
          if ('method' in result && typeof result.method === 'string') {
            method = result.method;
            messageId = ('messageId' in result ? result.messageId : null) || null;
          } else {
            // It's a Firebase BatchResponse
            method = 'push';
            // BatchResponse doesn't have a single messageId, so we leave it null
          }
        }
        
        results.push({
          userId: recipient.user_id,
          result: result,
          success: !!result,
          method,
          messageId,
        });
        
        if (result) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error: any) {
        console.error('Error sending check-out notification:', error);
        results.push({
          userId: recipient.user_id,
          error: error.message,
          success: false,
        });
        failedCount++;
      }
    }
    
    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      results,
    };
  } catch (error) {
    console.error('Error in notifyOnCheckOut:', error);
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send check-in reminder to worker (15 min before start)
 * This will be called by a cron job
 */
export async function sendCheckInReminder(params: {
  projectId: string;
  userId: string;
  userName: string;
  workDayStart: string;
}) {
  const { projectId, userId, userName, workDayStart } = params;
  const supabase = await createClient();

  try {
    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (!project) {
      return;
    }

    await sendNotification({
      userId,
      type: 'reminder',
      title: '⏰ Dags att checka in snart',
      body: `Projekt: ${project.name}\nStarttid: ${workDayStart}`,
      url: `/dashboard/time`,
      data: {
        projectId,
        type: 'checkin_reminder',
      },
      tag: `checkin-reminder-${projectId}-${userId}`,
    });

    console.log(`✅ Sent check-in reminder to ${userName} for ${project.name}`);
  } catch (error) {
    console.error('Error in sendCheckInReminder:', error);
  }
}

/**
 * Send check-out reminder to worker (15 min before end)
 * This will be called by a cron job
 */
export async function sendCheckOutReminder(params: {
  projectId: string;
  userId: string;
  userName: string;
  workDayEnd: string;
}) {
  const { projectId, userId, userName, workDayEnd } = params;
  const supabase = await createClient();

  try {
    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (!project) {
      return;
    }

    await sendNotification({
      userId,
      type: 'reminder',
      title: '⏰ Glöm inte checka ut',
      body: `Projekt: ${project.name}\nSluttid: ${workDayEnd}`,
      url: `/dashboard/time`,
      data: {
        projectId,
        type: 'checkout_reminder',
      },
      tag: `checkout-reminder-${projectId}-${userId}`,
    });

    console.log(`✅ Sent check-out reminder to ${userName} for ${project.name}`);
  } catch (error) {
    console.error('Error in sendCheckOutReminder:', error);
  }
}

/**
 * Send late check-in alert to admin/foreman
 * This will be called by a cron job
 */
export async function sendLateCheckInAlert(params: {
  projectId: string;
  userId: string;
  userName: string;
  workDayStart: string;
  minutesLate: number;
}) {
  const { projectId, userId, userName, workDayStart } = params;
  const supabase = await createClient();

  try {
    // Get project with alert settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, org_id, alert_settings')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return;
    }

    // Get admin and foreman users in the organization
    const { data: recipients } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', project.org_id)
      .eq('is_active', true)
      .in('role', ['admin', 'foreman']);

    if (!recipients?.length) {
      return;
    }

    const currentTime = new Date().toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send notification to each recipient
    for (const recipient of recipients) {
      await sendNotification({
        userId: recipient.user_id,
        type: 'alert',
        title: '⚠️ Sen check-in',
        body: `${userName} har inte checkat in på ${project.name}\nStarttid var ${workDayStart} (nu ${currentTime})`,
        url: `/dashboard/projects/${projectId}`,
        data: {
          projectId,
          userId,
          type: 'late_checkin',
        },
        tag: `late-checkin-${projectId}-${userId}`,
        skipQuietHours: true, // Operational alerts should bypass quiet hours
      });
    }

    console.log(`✅ Sent late check-in alert for ${userName} on ${project.name}`);
  } catch (error) {
    console.error('Error in sendLateCheckInAlert:', error);
  }
}

/**
 * Send forgotten check-out alert to admin/foreman
 * This will be called by a cron job
 */
export async function sendForgottenCheckOutAlert(params: {
  projectId: string;
  userId: string;
  userName: string;
  workDayEnd: string;
  checkedInSince: string;
}) {
  const { projectId, userId, userName, workDayEnd, checkedInSince } = params;
  const supabase = await createClient();

  try {
    // Get project with alert settings
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, org_id, alert_settings')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return;
    }

    // Get admin and foreman users in the organization
    const { data: recipients } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', project.org_id)
      .eq('is_active', true)
      .in('role', ['admin', 'foreman']);

    if (!recipients?.length) {
      return;
    }

    const currentTime = new Date().toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send notification to each recipient
    for (const recipient of recipients) {
      await sendNotification({
        userId: recipient.user_id,
        type: 'alert',
        title: '⚠️ Glömt check-out',
        body: `${userName} har inte checkat ut från ${project.name}\nSluttid var ${workDayEnd} (nu ${currentTime})\nIncheckad sedan: ${checkedInSince}`,
        url: `/dashboard/projects/${projectId}`,
        data: {
          projectId,
          userId,
          type: 'forgotten_checkout',
        },
        tag: `forgotten-checkout-${projectId}-${userId}`,
        skipQuietHours: true, // Operational alerts should bypass quiet hours
      });
    }

    console.log(`✅ Sent forgotten check-out alert for ${userName} on ${project.name}`);
  } catch (error) {
    console.error('Error in sendForgottenCheckOutAlert:', error);
  }
}

