const CACHE_NAME = 'dinov1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/main.js',
  '/images/dino-mascot.png',
  '/sounds/positive.mp3',
  '/sounds/neutral.mp3',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache new responses for future offline use
            if (event.request.method === 'GET' &&
                networkResponse.status === 200 &&
                networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed - fall back to the offline page for HTML/navigation requests
            const acceptHeader = event.request.headers.get('accept') || '';
            if (event.request.mode === 'navigate' || acceptHeader.includes('text/html')) {
              return caches.match('/offline.html').then((offlinePage) => {
                return offlinePage || new Response(
                  '<!DOCTYPE html><html><body><h1>Offline</h1></body></html>',
                  { status: 503, headers: { 'Content-Type': 'text/html' } }
                );
              });
            }
            // Fall back to any cached copy for non-HTML requests, or a
            // synthetic response so callers never see an unhandled rejection.
            return caches.match(event.request).then((cachedAsset) => {
              return cachedAsset || new Response('', {
                status: 503,
                statusText: 'Offline and no cached copy available'
              });
            });
          });
      })
  );
});