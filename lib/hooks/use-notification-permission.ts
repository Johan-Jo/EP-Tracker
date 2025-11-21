/**
 * Hook for managing notification permissions
 * Handles requesting permission and registering service worker
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface UseNotificationPermissionReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  hasActiveSubscription: boolean;
}

export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const checkActiveSubscription = useCallback(async () => {
    try {
      // Check if user has active subscriptions in push_subscriptions table
      const response = await fetch('/api/notifications/subscriptions/check');
      if (response.ok) {
        const data = await response.json();
        setHasActiveSubscription(data.hasActiveSubscription || false);
      } else {
        setHasActiveSubscription(false);
      }
    } catch (error) {
      console.error('[Notifications] Error checking subscription:', error);
      setHasActiveSubscription(false);
    }
  }, []);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      const updatePermission = () => {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        // Check if user has active subscription (only if permission is granted)
        if (currentPermission === 'granted') {
          checkActiveSubscription();
        } else {
          setHasActiveSubscription(false);
        }
      };

      // Initial check
      updatePermission();

      // Listen for focus events to check if permission changed
      // (user might have changed browser settings in another tab)
      const handleFocus = () => {
        updatePermission();
      };

      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [checkActiveSubscription]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push-notiser stöds inte i din webbläsare');
      return false;
    }

    // Check current permission first
    const currentPermission = Notification.permission;
    
    // Note: Even if permission is 'denied', we should still try to request it
    // because the user might have changed browser settings. However, if it's
    // still denied after the request, we'll show appropriate instructions.
    
    setIsLoading(true);

    try {
      // Request notification permission
      // This will show a prompt if permission is 'default'
      // If permission is 'denied', it will immediately return 'denied' without showing a prompt
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        if (result === 'denied') {
          // Permission is denied - user needs to change browser settings
          // Don't show error toast here - the UI component will show the proper message
          setIsLoading(false);
          return false;
        } else {
          // Permission is still 'default' (user dismissed the prompt)
          toast.error('Du måste ge tillstånd för att aktivera notiser');
          setIsLoading(false);
          return false;
        }
      }

      // Register service worker
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[Notifications] Service Worker registered:', registration);
      } catch (error) {
        console.error('[Notifications] Service Worker registration failed:', error);
        toast.error('Kunde inte registrera service worker');
        setIsLoading(false);
        return false;
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get FCM token using Firebase Messaging SDK
      const token = await getFCMToken();

      if (!token) {
        toast.error('Kunde inte få notis-token. Kontrollera att Firebase är korrekt konfigurerad.');
        setIsLoading(false);
        return false;
      }

      // Subscribe to push notifications
      const deviceInfo = getDeviceInfo();
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceInfo }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      // Refresh subscription status to ensure it's in sync with database
      await checkActiveSubscription();
      toast.success('Push-notiser aktiverade! 🎉');
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error);
      toast.error('Kunde inte aktivera notiser');
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    permission,
    isSupported,
    isLoading,
    requestPermission,
    hasActiveSubscription,
  };
}

/**
 * Get FCM token using Firebase Messaging SDK
 */
async function getFCMToken(): Promise<string | null> {
  try {
    // Dynamically import Firebase Messaging to avoid SSR issues
    const { getToken } = await import('firebase/messaging');
    const { getMessaging } = await import('firebase/messaging');
    const { getApp } = await import('firebase/app');
    const { firebaseConfig, vapidKey } = await import('@/lib/firebase/config');
    const { initializeApp, getApps } = await import('firebase/app');

    // Initialize Firebase app if not already initialized
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Get messaging instance
    const messaging = getMessaging(app);

    if (!messaging) {
      console.error('[Notifications] Firebase Messaging not available');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get FCM token
    if (!vapidKey) {
      console.error('[Notifications] VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[Notifications] FCM token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.error('[Notifications] No FCM token available');
      return null;
    }
  } catch (error: any) {
    console.error('[Notifications] Error getting FCM token:', error);
    // If Firebase is not configured, provide helpful error message
    if (error.code === 'messaging/registration-token-not-retrieved') {
      console.error('[Notifications] Make sure Firebase is properly configured and VAPID key is set');
    }
    return null;
  }
}

/**
 * Get device information
 */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let type: 'android' | 'ios' | 'desktop' = 'desktop';

  if (/android/i.test(ua)) {
    type = 'android';
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    type = 'ios';
  }

  return {
    type,
    name: navigator.platform,
    userAgent: ua,
  };
}

