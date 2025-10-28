import { sendNotification } from './send-notification';

interface CheckOutReminderPayload {
  userId: string;
  projectName: string;
  checkInTime: string;
}

/**
 * Send check-out reminder notification
 */
export async function sendCheckOutReminder(payload: CheckOutReminderPayload) {
  const checkInDate = new Date(payload.checkInTime);
  const hoursWorked = Math.floor((Date.now() - checkInDate.getTime()) / (1000 * 60 * 60));

  return sendNotification({
    userId: payload.userId,
    type: 'checkout_reminder',
    title: 'Glöm inte checka ut!',
    body: `Du är incheckad på ${payload.projectName} sedan ${hoursWorked}h`,
    url: '/dashboard',
    data: {
      project_name: payload.projectName,
      hours_worked: hoursWorked.toString(),
    },
  });
}

