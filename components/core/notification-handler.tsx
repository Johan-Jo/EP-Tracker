'use client';

import { useEffect, useRef } from 'react';

/**
 * Register Service Worker and handle foreground notifications
 */
export function NotificationHandler() {
  const listenerSetupRef = useRef(false);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Prevent double registration (React strict mode in dev can cause double renders)
    if (listenerSetupRef.current) {
      console.log('[NotificationHandler] Listener already set up, skipping');
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
        const unsubscribeFn = messagingModule.onMessageListener(async (payload) => {
          console.log('📨 Foreground notification received:', payload);

          // Show browser notification if permission granted
          // Note: For foreground messages, Firebase onMessage is called, but the service worker
          // might also show it. We use tag to prevent duplicates.
          if (Notification.permission === 'granted') {
            const title = payload.notification?.title || payload.data?.title || 'EP-Tracker';
            const tag = payload.data?.tag || payload.data?.type || 'ep-tracker-notification';
            
            const options = {
              body: payload.notification?.body || payload.data?.body || '',
              icon: '/images/faviconEP.png',
              badge: '/images/faviconEP.png',
              data: payload.data,
              tag: tag, // Use tag to prevent duplicate notifications
            };

            // For foreground messages, Firebase onMessage is called
            // The service worker's onBackgroundMessage should NOT be called when app is in foreground
            // But to be safe, check if notification already exists before showing
            try {
              const registration = await navigator.serviceWorker.getRegistration();
              if (registration) {
                const existingNotifications = await registration.getNotifications({ tag });
                
                if (existingNotifications && existingNotifications.length > 0) {
                  console.log(`[NotificationHandler] Notification with tag ${tag} already exists (${existingNotifications.length}), skipping to prevent duplicate`);
                  return; // Don't show duplicate
                }
              }
              
              // No existing notification with this tag, show it
              console.log(`[NotificationHandler] Showing foreground notification with tag ${tag}`);
              new Notification(title, options);
            } catch (error) {
              // Fallback: just show the notification if we can't check
              console.warn('[NotificationHandler] Could not check existing notifications, showing anyway:', error);
              new Notification(title, options);
            }
          }
        });
        
        // Ensure unsubscribe is a function
        if (typeof unsubscribeFn === 'function') {
          unsubscribe = unsubscribeFn;
          listenerSetupRef.current = true;
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
      listenerSetupRef.current = false;
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

