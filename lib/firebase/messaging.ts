'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from './config';

// Initialize Firebase app (client-side only)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messaging: Messaging | null = null;

// Initialize Firebase Messaging (only in browser)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    console.error('Firebase Messaging not initialized');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onMessageListener(callback: (payload: any) => void) {
  if (!messaging) {
    console.error('Firebase Messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, callback);
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

