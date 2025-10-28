import { sendNotification } from './send-notification';

interface ApprovalConfirmedPayload {
  userId: string;
  weekNumber: number;
  year: number;
  approverName: string;
  totalHours: number;
}

/**
 * Send notification when time/expense report is approved
 */
export async function sendApprovalConfirmed(payload: ApprovalConfirmedPayload) {
  return sendNotification({
    userId: payload.userId,
    type: 'approval_confirmed',
    title: '✅ Tidrapport godkänd',
    body: `Din veckorapport för vecka ${payload.weekNumber} (${payload.totalHours}h) har godkänts av ${payload.approverName}`,
    url: '/dashboard/time',
    data: {
      week_number: payload.weekNumber.toString(),
      year: payload.year.toString(),
      approver_name: payload.approverName,
      total_hours: payload.totalHours.toString(),
    },
  });
}

