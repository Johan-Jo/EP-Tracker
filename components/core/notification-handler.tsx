'use client';

import { useEffect } from 'react';
import { onMessageListener } from '@/lib/firebase/messaging';

/**
 * Register Service Worker and handle foreground notifications
 */
export function NotificationHandler() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        // Only register service worker in production
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      } else {
        // In development, unregister any existing service workers
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log('🔄 Unregistered service worker in dev mode');
              }
            });
          }
        });
      }
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

