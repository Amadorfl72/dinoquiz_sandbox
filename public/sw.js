const CACHE_NAMES = {
  APP_SHELL: 'dinoquiz-app-shell-v1',
  ASSETS: 'dinoquiz-assets-v1',
  AUDIO: 'dinoquiz-audio-v1',
  IMAGES: 'dinoquiz-images-v1',
  QUESTIONS: 'dinoquiz-questions-v1'
};

const ASSETS_TO_CACHE = {
  APP_SHELL: [
    '/',
    '/index.html',
    '/styles/main.css',
    '/scripts/app.js'
  ],
  ASSETS: [
    '/styles/main.css',
    '/scripts/app.js'
  ],
  AUDIO: [
    '/audio/positive.mp3',
    '/audio/neutral.mp3'
  ],
  IMAGES: [
    '/images/dino-mascot.png'
  ],
  QUESTIONS: [
    '/data/questions.json'
  ]
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAMES.APP_SHELL).then((cache) => cache.addAll(ASSETS_TO_CACHE.APP_SHELL)),
      caches.open(CACHE_NAMES.ASSETS).then((cache) => cache.addAll(ASSETS_TO_CACHE.ASSETS)),
      caches.open(CACHE_NAMES.AUDIO).then((cache) => cache.addAll(ASSETS_TO_CACHE.AUDIO)),
      caches.open(CACHE_NAMES.IMAGES).then((cache) => cache.addAll(ASSETS_TO_CACHE.IMAGES)),
      caches.open(CACHE_NAMES.QUESTIONS).then((cache) => cache.addAll(ASSETS_TO_CACHE.QUESTIONS))
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = Object.values(CACHE_NAMES);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});