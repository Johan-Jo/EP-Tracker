export { sendNotification } from './send-notification';
export { notifyTeamCheckIn } from './team-checkin';
export { sendApprovalConfirmed } from './approval-confirmed';
export { sendApprovalNeededNotifications } from './approval-needed';
export { messaging } from './firebase-admin';

// Epic 25 Phase 2: Project-specific alerts
export {
	notifyOnCheckIn,
	notifyOnCheckOut,
	sendCheckInReminder,
	sendCheckOutReminder,
	sendLateCheckInAlert,
	sendForgottenCheckOutAlert,
} from './project-alerts';

