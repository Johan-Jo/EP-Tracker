// Firebase Configuration
// Reads from environment variables (NEXT_PUBLIC_*)

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Validate that all required environment variables are present
if (typeof window !== 'undefined') {
  const missingVars = [];
  
  if (!firebaseConfig.apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.storageBucket) missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!firebaseConfig.messagingSenderId) missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!firebaseConfig.appId) missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  if (!vapidKey) missingVars.push('NEXT_PUBLIC_FIREBASE_VAPID_KEY');
  
  if (missingVars.length > 0) {
    console.error(
      '❌ Missing Firebase environment variables:\n' +
      missingVars.map(v => `  - ${v}`).join('\n')
    );
  }
}

