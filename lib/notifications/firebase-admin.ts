import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Debug: Log what we're getting from environment
    console.log('🔍 Firebase credentials check:');
    console.log('  PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'MISSING');
    console.log('  CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL || 'MISSING');
    console.log('  PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY?.length || 0);
    console.log('  PRIVATE_KEY starts with:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30) || 'MISSING');
    console.log('  PRIVATE_KEY ends with:', process.env.FIREBASE_PRIVATE_KEY?.substring(process.env.FIREBASE_PRIVATE_KEY.length - 30) || 'MISSING');
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.warn('⚠️ Firebase Admin SDK not configured - notifications disabled');
      console.log('  Missing:', {
        projectId: !process.env.FIREBASE_PROJECT_ID,
        clientEmail: !process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: !privateKey,
      });
    } else {
      console.log('🔑 Attempting to initialize Firebase Admin SDK...');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    console.error('  Error type:', error instanceof Error ? error.constructor.name : typeof error);
  }
}

export const messaging = admin.apps.length > 0 ? admin.messaging() : null;

