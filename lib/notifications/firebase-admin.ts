import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.warn('⚠️ Firebase Admin SDK not configured - notifications disabled');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('✅ Firebase Admin SDK initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
  }
}

export const messaging = admin.apps.length > 0 ? admin.messaging() : null;

