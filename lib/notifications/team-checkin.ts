/**
 * Team check-in/check-out notifications
 * Sent to foremen/admins when team members check in or out
 */

import { sendNotificationToMultipleUsers } from './send-notification';
import { createClient } from '@/lib/supabase/server';

export interface TeamCheckInData {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  action: 'check_in' | 'check_out';
  timestamp: string;
}

export async function sendTeamCheckInNotification(data: TeamCheckInData) {
  const supabase = await createClient();

  // Get all foremen and admins who have access to this project
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, profiles(full_name), memberships(role)')
    .eq('project_id', data.projectId)
    .in('memberships.role', ['admin', 'foreman']);

  if (!members || members.length === 0) {
    console.log('[Team Check-in] No foremen/admins to notify for project', data.projectId);
    return;
  }

  // Filter out the user who checked in/out
  const recipientIds = members
    .filter((m) => m.user_id !== data.userId)
    .map((m) => m.user_id);

  if (recipientIds.length === 0) {
    return;
  }

  const actionText = data.action === 'check_in' ? 'checkade in' : 'checkade ut';
  const emoji = data.action === 'check_in' ? '✅' : '👋';
  const time = new Date(data.timestamp).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return await sendNotificationToMultipleUsers(recipientIds, {
    type: data.action === 'check_in' ? 'team_checkin' : 'team_checkout',
    title: `${emoji} ${data.userName} ${actionText}`,
    body: `Projekt: ${data.projectName} • ${time}`,
    url: '/dashboard/planning/today',
    data: {
      user_id: data.userId,
      user_name: data.userName,
      project_id: data.projectId,
      project_name: data.projectName,
      action: data.action,
      timestamp: data.timestamp,
    },
  });
}

