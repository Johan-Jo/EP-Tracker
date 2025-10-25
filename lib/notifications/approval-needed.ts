/**
 * Approval needed notifications
 * Sent to admins/foremen when time reports need approval
 */

import { sendNotificationToMultipleUsers } from './send-notification';
import { createClient } from '@/lib/supabase/server';

export interface ApprovalNeededData {
  orgId: string;
  count: number;
  weekNumber: number;
  year: number;
}

export async function sendApprovalNeededNotification(data: ApprovalNeededData) {
  const supabase = await createClient();

  // Get all admins and foremen in the organization
  const { data: members } = await supabase
    .from('memberships')
    .select('user_id, role')
    .eq('org_id', data.orgId)
    .eq('is_active', true)
    .in('role', ['admin', 'foreman']);

  if (!members || members.length === 0) {
    console.log('[Approval Needed] No admins/foremen to notify for org', data.orgId);
    return;
  }

  const recipientIds = members.map((m) => m.user_id);

  const weekText = `vecka ${data.weekNumber}`;
  const countText = data.count === 1 ? 'tidrapport' : 'tidrapporter';

  return await sendNotificationToMultipleUsers(recipientIds, {
    type: 'approval_needed',
    title: '📊 Tidrapporter väntar på godkännande',
    body: `${data.count} ${countText} för ${weekText} behöver granskas`,
    url: '/dashboard/approvals',
    data: {
      count: data.count.toString(),
      week_number: data.weekNumber.toString(),
      year: data.year.toString(),
    },
  });
}

