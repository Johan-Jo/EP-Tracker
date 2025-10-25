/**
 * Check-out reminder notifications
 * Sent to users who haven't checked out at end of day
 */

import { sendNotification } from './send-notification';

export interface CheckOutReminderData {
  userId: string;
  projectName: string;
  projectId: string;
  checkInTime: string;
  hoursWorked: number;
}

export async function sendCheckOutReminder(data: CheckOutReminderData) {
  const duration = formatDuration(data.hoursWorked);

  return await sendNotification({
    userId: data.userId,
    type: 'checkout_reminder',
    title: 'Glöm inte checka ut!',
    body: `Du är incheckad på ${data.projectName} sedan ${duration}`,
    url: '/dashboard',
    data: {
      project_id: data.projectId,
      project_name: data.projectName,
      check_in_time: data.checkInTime,
    },
    requireInteraction: true,
  });
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minuter`;
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours} timmar`;
  }
  
  return `${wholeHours}h ${minutes}min`;
}

