'use client';

import { useEffect } from 'react';
import { onMessageListener } from '@/lib/firebase/messaging';

/**
 * Register Service Worker and handle foreground notifications
 */
export function NotificationHandler() {
  useEffect(() => {
    // Register Firebase Service Worker for push notifications
    // IMPORTANT: Must be firebase-messaging-sw.js for FCM to work
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('✅ Firebase Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ Firebase Service Worker registration failed:', error);
        });
    }

    // Listen for foreground messages
    const unsubscribe = onMessageListener((payload) => {
      console.log('📨 Foreground notification received:', payload);

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        const title = payload.notification?.title || payload.data?.title || 'EP-Tracker';
        const options = {
          body: payload.notification?.body || payload.data?.body || '',
          icon: '/images/faviconEP.png',
          badge: '/images/faviconEP.png',
          data: payload.data,
        };

        new Notification(title, options);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

