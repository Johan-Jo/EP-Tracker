import { sendNotification } from './send-notification';
import { createClient } from '@/lib/supabase/server';

interface TeamCheckInPayload {
  userId: string; // The user who checked in/out
  projectId: string;
  action: 'check_in' | 'check_out';
}

/**
 * Notify team leads when a team member checks in or out
 */
export async function notifyTeamCheckIn(payload: TeamCheckInPayload) {
  try {
    const supabase = await createClient();

    // 1. Get user info
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', payload.userId)
      .single();

    // 2. Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('name, org_id')
      .eq('id', payload.projectId)
      .single();

    if (!userProfile || !project) {
      console.error('❌ Could not find user or project for team check-in notification');
      return;
    }

    // 3. Find team leads (admins and foremen in the same org)
    const { data: teamLeads } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', project.org_id)
      .in('role', ['admin', 'foreman'])
      .neq('user_id', payload.userId); // Don't notify the user who checked in

    if (!teamLeads || teamLeads.length === 0) {
      console.log('📭 No team leads to notify');
      return;
    }

    // 4. Send notification to each team lead
    const action = payload.action === 'check_in' ? 'checkade in' : 'checkade ut';
    const emoji = payload.action === 'check_in' ? '👷' : '🏠';

    const notifications = teamLeads.map((lead) =>
      sendNotification({
        userId: lead.user_id,
        type: `team_${payload.action}`,
        title: `${emoji} ${userProfile.full_name} ${action}`,
        body: `På projekt: ${project.name}`,
        url: '/dashboard',
        data: {
          project_id: payload.projectId,
          project_name: project.name,
          user_name: userProfile.full_name,
          action: payload.action,
        },
      })
    );

    await Promise.all(notifications);
    console.log(`✅ Sent team check-in notifications to ${teamLeads.length} team leads`);
  } catch (error) {
    console.error('❌ Error sending team check-in notification:', error);
  }
}

