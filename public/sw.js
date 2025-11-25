// EP-Tracker Combined Service Worker
// Handles BOTH offline caching (Workbox) AND push notifications (Firebase)

// Import Firebase scripts for push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAcsNNhpRiqIvVNiyd16aZeOOknKxdsZJo",
  authDomain: "ep-tracker-dev-6202a.firebaseapp.com",
  projectId: "ep-tracker-dev-6202a",
  storageBucket: "ep-tracker-dev-6202a.firebasestorage.app",
  messagingSenderId: "117589001561",
  appId: "1:117589001561:web:b69baface5a06172d43848"
});

const messaging = firebase.messaging();

// ==========================================
// FIREBASE CLOUD MESSAGING (Push Notifications)
// ==========================================

// Handle background messages (when app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background push notification:', payload);

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
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
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
        // No window open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ==========================================
// OFFLINE CACHING (Workbox-style)
// ==========================================

const CACHE_NAME = 'ep-tracker-cache-v2'; // Bump version to force cache clear

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/images/faviconEP.png',
  '/manifest.json',
];

// Install event - precache important assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        // Use addAll but catch individual failures
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            fetch(url)
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn(`[SW] Failed to cache ${url}: ${response.status}`);
              })
              .catch((error) => {
                console.warn(`[SW] Failed to cache ${url}:`, error);
              })
          )
        );
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete ALL old caches to ensure clean slate
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        // Force take control and skip waiting
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients to reload
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', action: 'reload' });
          });
        });
      })
  );
  
  // Skip waiting immediately to activate new service worker
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Skip API requests (always fetch fresh from network)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        });
      })
    );
    return;
  }

  // For navigation requests (pages)
  if (event.request.mode === 'navigate') {
    // Don't cache dynamic dashboard routes - always fetch fresh
    const url = new URL(event.request.url);
    if (url.pathname.startsWith('/dashboard/')) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            // Don't cache error responses, and don't cache dashboard routes
            // Always return fresh response for dashboard pages
            return response;
          })
          .catch(() => {
            // Offline - try cache as fallback only
            return caches.match(event.request).then((cached) => {
              // Only use cache if it's a successful response (not error)
              if (cached && cached.ok) {
                return cached;
              }
              // Return offline error if no good cache
              return new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
              });
            });
          })
      );
      return;
    }

    // For other navigation requests, use network-first with cache fallback
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses (2xx)
          if (response.ok && response.status >= 200 && response.status < 300) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - try cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For all other requests (images, CSS, JS, etc.)
  // Cache-first strategy: try cache, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Only return cached version if it's a successful response
          // Don't serve cached error responses
          if (cachedResponse.ok) {
            // Return cached version, but update in background
            fetch(event.request)
              .then((networkResponse) => {
                // Only cache successful responses (2xx)
                if (networkResponse.ok && networkResponse.status >= 200 && networkResponse.status < 300) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse);
                  });
                } else {
                  // Remove bad cached response
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.delete(event.request);
                  });
                }
              })
              .catch(() => {
                // Network failed, cached version is fine (it's already successful)
              });
            
            return cachedResponse;
          } else {
            // Cached response is an error, delete it and fetch fresh
            caches.open(CACHE_NAME).then((cache) => {
              cache.delete(event.request);
            });
          }
        }

        // Not in cache or cached response was bad, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Only cache successful responses (2xx)
            if (response.ok && response.status >= 200 && response.status < 300 && event.request.url.startsWith('http')) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          });
      })
  );
});

console.log('[SW] EP-Tracker Service Worker loaded - handles push notifications + offline caching');

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

