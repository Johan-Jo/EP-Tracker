// Firebase Cloud Messaging Service Worker
// This file must be served from the root (public/) directory

// Import Firebase scripts (using importScripts for service workers)
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration will be injected by the app
// Using a placeholder config that will be overridden
const firebaseConfig = {
  apiKey: 'PLACEHOLDER',
  authDomain: 'PLACEHOLDER',
  projectId: 'PLACEHOLDER',
  storageBucket: 'PLACEHOLDER',
  messagingSenderId: 'PLACEHOLDER',
  appId: 'PLACEHOLDER',
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  
  const messaging = firebase.messaging();
  
  console.log('[FCM SW] Firebase Messaging initialized');
  
  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'EP-Tracker';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Du har en ny notifikation',
      icon: payload.notification?.icon || payload.data?.icon || '/images/faviconEP.png',
      badge: payload.data?.badge || '/images/faviconEP.png',
      data: payload.data || {},
      tag: payload.data?.type || 'ep-tracker-notification',
      requireInteraction: payload.data?.requireInteraction === 'true',
      vibrate: [200, 100, 200],
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('[FCM SW] Error initializing Firebase:', error);
}

