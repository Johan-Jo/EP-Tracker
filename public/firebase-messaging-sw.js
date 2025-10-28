// Firebase Cloud Messaging Service Worker
// This file MUST be in the public directory at the root level

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
// Note: This config is safe to expose (it's public info)
// The actual security is handled by Firebase security rules
firebase.initializeApp({
  apiKey: "AIzaSyAcsNNhpRiqIvVNiyd16aZeOOknKxdsZJo",
  authDomain: "ep-tracker-dev-6202a.firebaseapp.com",
  projectId: "ep-tracker-dev-6202a",
  storageBucket: "ep-tracker-dev-6202a.firebasestorage.app",
  messagingSenderId: "117589001561",
  appId: "1:117589001561:web:b69baface5a06172d43848"
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'EP-Tracker';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Ny notifikation',
    icon: payload.notification?.icon || payload.data?.icon || '/images/faviconEP.png',
    badge: '/images/faviconEP.png',
    data: payload.data || {},
    tag: payload.data?.tag || 'ep-tracker-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              if (client.navigate) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

