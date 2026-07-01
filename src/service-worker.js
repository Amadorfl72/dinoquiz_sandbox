const CACHE_NAME = 'dinoquiz-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/main.js',
  '/assets/images/dino-mascot.png',
  '/assets/sounds/positive-feedback.mp3',
  '/assets/sounds/neutral-feedback.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});