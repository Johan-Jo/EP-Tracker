/**
 * Notifications module
 * Central export point for all notification functions
 */

export * from './send-notification';
export * from './check-out-reminder';
export * from './team-checkin';
export * from './approval-needed';
export * from './approval-confirmed';
export { getMessaging, isFirebaseConfigured, getFirebaseProjectId } from './firebase-admin';

