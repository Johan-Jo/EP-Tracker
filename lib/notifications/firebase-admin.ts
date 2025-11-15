/**
 * Firebase Admin SDK initialization
 * Used for sending push notifications server-side
 */

import * as admin from 'firebase-admin';

// Singleton instance
let messagingInstance: admin.messaging.Messaging | null = null;

/**
 * Initialize Firebase Admin SDK if not already initialized
 * Uses environment variables for credentials
 */
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Check for required environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase Admin] Missing environment variables. Push notifications will not work.');
    console.warn('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    return null;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // Handle escaped newlines in private key
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    console.log('[Firebase Admin] Successfully initialized');
    return app;
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 * Lazy initialization on first use
 */
export function getMessaging(): admin.messaging.Messaging | null {
  if (messagingInstance) {
    return messagingInstance;
  }

  const app = initializeFirebaseAdmin();
  if (!app) {
    return null;
  }

  try {
    messagingInstance = admin.messaging(app);
    return messagingInstance;
  } catch (error) {
    console.error('[Firebase Admin] Error getting messaging instance:', error);
    return null;
  }
}

/**
 * Check if Firebase Admin is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Get Firebase project ID
 */
export function getFirebaseProjectId(): string | undefined {
  return process.env.FIREBASE_PROJECT_ID;
}

