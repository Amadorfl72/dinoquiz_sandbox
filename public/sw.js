// Increment cache version when updating assets
const CACHE_NAME = 'dinoquiz-v1.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/main.js',
  '/assets/images/dino-mascot.png',
  '/assets/sounds/positive.mp3',
  '/assets/sounds/neutral.mp3',
  '/data/questions.json'
];

// Install event - cache all static assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all clients immediately
});

// Fetch event - implement network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  // For non-GET requests, use network only
  if (event.request.method !== 'GET') {
    return;
  }

  // For same-origin requests, use network-first strategy
  if (new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, cache it
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For cross-origin requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if found
        if (response) {
          return response;
        }
        // Otherwise fetch from network
        return fetch(event.request);
      })
  );
});