/**
 * Approval confirmed notifications
 * Sent to workers when their time reports are approved
 */

import { sendNotification } from './send-notification';

export interface ApprovalConfirmedData {
  userId: string;
  weekNumber: number;
  year: number;
  approverName: string;
  totalHours: number;
}

export async function sendApprovalConfirmedNotification(data: ApprovalConfirmedData) {
  const weekText = `vecka ${data.weekNumber}`;
  const hoursText = `${data.totalHours} timmar`;

  return await sendNotification({
    userId: data.userId,
    type: 'approval_confirmed',
    title: '✅ Din tidrapport har godkänts',
    body: `${weekText} (${hoursText}) godkänd av ${data.approverName}`,
    url: `/dashboard/time?week=${data.weekNumber}&year=${data.year}`,
    data: {
      week_number: data.weekNumber.toString(),
      year: data.year.toString(),
      approver_name: data.approverName,
      total_hours: data.totalHours.toString(),
    },
  });
}

