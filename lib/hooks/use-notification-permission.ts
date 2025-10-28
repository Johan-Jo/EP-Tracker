'use client';

import { useState, useEffect } from 'react';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission } from '@/lib/firebase/messaging';

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('Notifications not supported');
      return false;
    }

    setIsLoading(true);

    try {
      const token = await requestNotificationPermission();

      if (token) {
        // Subscribe to notifications
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            deviceInfo: {
              type: getDeviceType(),
              name: getDeviceName(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to subscribe to notifications');
        }

        setPermission('granted');
        setIsLoading(false);
        return true;
      }

      setPermission(getNotificationPermission());
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setIsLoading(false);
      return false;
    }
  };

  return {
    permission,
    isSupported,
    isLoading,
    requestPermission,
  };
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  
  const ua = navigator.userAgent;
  if (/iPad/.test(ua)) return 'iPad';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Web Browser';
}

