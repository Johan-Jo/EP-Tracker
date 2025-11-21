'use client';

import { useEffect } from 'react';

/**
 * Register Service Worker and handle foreground notifications
 */
export function NotificationHandler() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }

    // Listen for foreground messages (only if Firebase is available)
    let unsubscribe: (() => void) | undefined;
    
    const setupMessageListener = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const messagingModule = await import('@/lib/firebase/messaging');
        const unsubscribeFn = messagingModule.onMessageListener((payload) => {
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
        
        // Ensure unsubscribe is a function
        if (typeof unsubscribeFn === 'function') {
          unsubscribe = unsubscribeFn;
        } else {
          unsubscribe = undefined;
        }
      } catch (error: any) {
        // Firebase not configured or not available - this is OK
        console.log('[NotificationHandler] Firebase Messaging not available:', error?.message || 'Unknown error');
        unsubscribe = undefined;
      }
    };

    setupMessageListener().catch((error) => {
      console.log('[NotificationHandler] Error setting up message listener:', error);
      unsubscribe = undefined;
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[NotificationHandler] Error unsubscribing:', error);
        }
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

