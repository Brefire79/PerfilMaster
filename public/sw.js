// ProfileAI Service Worker
// Basic service worker — Workbox handles advanced caching via vite-plugin-pwa
// This file is a fallback/custom handler for offline scenarios

const CACHE_NAME = 'profileai-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

// Install event — cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Failed to precache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase requests (handled by SDK)
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase.com')
  ) {
    return;
  }

  // Skip chrome-extension and non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Try to return from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // For navigation requests, return the app shell
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-assessments') {
    event.waitUntil(syncPendingAssessments());
  }
});

async function syncPendingAssessments() {
  // Sync logic handled by the app when back online
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_ASSESSMENTS' });
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/badge-72x72.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'ProfileAI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data || '/')
  );
});
