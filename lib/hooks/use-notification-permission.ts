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

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      // Check if user has active subscription
      checkActiveSubscription();
    }
  }, []);

  const checkActiveSubscription = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        // If preferences exist, user probably has subscription
        setHasActiveSubscription(true);
      }
    } catch (error) {
      console.error('[Notifications] Error checking subscription:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push-notiser stöds inte i din webbläsare');
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Du måste ge tillstånd för att aktivera notiser');
        setIsLoading(false);
        return false;
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

      // Get FCM token (mock for now - Firebase SDK needed in production)
      const token = await getFCMToken();

      if (!token) {
        toast.error('Kunde inte få notis-token');
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

      setHasActiveSubscription(true);
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
 * Get FCM token (simplified version - in production, use Firebase SDK)
 */
async function getFCMToken(): Promise<string | null> {
  try {
    // In production, this would use Firebase Messaging SDK to get actual FCM token
    // For now, generate a mock token for testing
    const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[Notifications] Generated mock FCM token:', mockToken);
    return mockToken;
  } catch (error) {
    console.error('[Notifications] Error getting FCM token:', error);
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

