/**
 * Team check-in/check-out notifications
 * Sent to foremen/admins when team members check in or out
 */

import { sendNotificationToMultipleUsers } from './send-notification';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface TeamCheckInData {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  action: 'check_in' | 'check_out';
  timestamp: string;
}

export async function sendTeamCheckInNotification(data: TeamCheckInData) {
  // Use admin client to bypass RLS for fetching project and members
  const adminClient = createAdminClient();

  // First, get the project to find the organization
  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select('id, name, org_id')
    .eq('id', data.projectId)
    .single();

  if (projectError) {
    console.error('[Team Check-in] Error fetching project:', projectError);
    return;
  }

  if (!project) {
    console.log('[Team Check-in] Project not found:', data.projectId);
    return;
  }

  const orgId = project.org_id;

  if (!orgId) {
    console.log('[Team Check-in] No organization found for project', data.projectId);
    return;
  }

  // Get all admins and foremen in the same organization
  // Use admin client to bypass RLS (we need to find all admins regardless of current user)
  const { data: members, error: membersError } = await adminClient
    .from('memberships')
    .select('user_id, role')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .in('role', ['admin', 'foreman']);

  if (membersError) {
    console.error('[Team Check-in] Error fetching members:', membersError);
    return;
  }

  if (!members || members.length === 0) {
    console.log('[Team Check-in] No admins/foremen to notify in organization', orgId);
    return;
  }

  console.log(`[Team Check-in] Found ${members.length} admins/foremen in org ${orgId}:`, 
    members.map(m => `${m.user_id.substring(0, 8)}... (${m.role})`).join(', '));

  // Filter out the user who checked in/out
  const recipientIds = members
    .filter((m) => m.user_id !== data.userId)
    .map((m) => m.user_id);

  if (recipientIds.length === 0) {
    console.log('[Team Check-in] No recipients after filtering out user');
    return;
  }

  console.log(`[Team Check-in] Sending notification to ${recipientIds.length} admins/foremen`);

  const actionText = data.action === 'check_in' ? 'checkade in' : 'checkade ut';
  const emoji = data.action === 'check_in' ? '✅' : '👋';
  const time = new Date(data.timestamp).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return await sendNotificationToMultipleUsers(recipientIds, {
    type: data.action === 'check_in' ? 'team_checkin' : 'team_checkout',
    title: `${emoji} ${data.userName} ${actionText}`,
    body: `Projekt: ${data.projectName || project.name} • ${time}`,
    url: '/dashboard/planning/today',
    orgId: orgId,
    data: {
      user_id: data.userId,
      user_name: data.userName,
      project_id: data.projectId,
      project_name: data.projectName || project.name,
      action: data.action,
      timestamp: data.timestamp,
    },
  });
}

