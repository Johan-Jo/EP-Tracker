import { sendNotification } from './send-notification';
import { createClient } from '@/lib/supabase/server';

/**
 * Send weekly approval reminder to admins/foremen
 */
export async function sendApprovalNeededNotifications(orgId: string) {
  try {
    const supabase = await createClient();

    // 1. Count pending approvals
    const { count } = await supabase
      .from('time_entries')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('approved', false);

    if (!count || count === 0) {
      console.log('✅ No pending approvals');
      return;
    }

    // 2. Find all admins/foremen in the org
    const { data: approvers } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .in('role', ['admin', 'foreman']);

    if (!approvers || approvers.length === 0) {
      console.log('📭 No approvers found');
      return;
    }

    // 3. Send notification to each approver
    const notifications = approvers.map((approver) =>
      sendNotification({
        userId: approver.user_id,
        type: 'approval_needed',
        title: '📊 Tidrapporter väntar på godkännande',
        body: `${count} tidrapporter behöver granskas`,
        url: '/dashboard/approvals',
        data: {
          count: count.toString(),
        },
      })
    );

    await Promise.all(notifications);
    console.log(`✅ Sent approval reminders to ${approvers.length} approvers`);
  } catch (error) {
    console.error('❌ Error sending approval needed notifications:', error);
  }
}

