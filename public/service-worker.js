/**
 * DinoQuiz service worker.
 *
 * Strategy:
 *  - Precache the app shell (HTML/CSS/JS/manifest/icons/offline fallback) on
 *    install so the game can start with zero network access.
 *  - Runtime cache-first for game assets that ship progressively (dinosaur
 *    images, sound effects, question bank JSON) — cached the first time
 *    they're fetched, then served from cache on every subsequent load.
 *  - Network-first (falling back to cache, then the offline page) for HTML
 *    navigations, so a connected player always sees the latest shell while
 *    an offline player still gets the last cached one.
 *
 * Bump SW_VERSION whenever precached files change so old caches are dropped
 * on activate.
 */
const SW_VERSION = 'v5';
const PRECACHE_NAME = `dinoquiz-precache-${SW_VERSION}`;
const RUNTIME_CACHE_NAME = `dinoquiz-runtime-${SW_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/scripts/scoring.js',
  '/scripts/adsService.js',
  '/scripts/gameFlow.js',
  '/scripts/homeScreen.js',
  '/scripts/privacyPolicyScreen.js',
  '/scripts/questionScreen.js',
  '/scripts/resultsScreen.js',
  '/scripts/main.js',
  '/icons/icon.svg',
  '/assets/images/mascot.svg',
  '/i18n/es.json',
  '/data/questions.json',
  '/offline.html',
];

// Assets that are added to the app progressively (dinosaur art, sound
// effects, the question bank) live under these paths and are cached the
// first time they're requested.
const RUNTIME_CACHEABLE_PATTERNS = [
  /\/assets\/images\//,
  /\/assets\/sounds\//,
  /\/data\/.*\.json$/,
  /\.(?:png|jpg|jpeg|webp|gif|svg)$/,
  /\.(?:mp3|ogg|wav)$/,
];

function isRuntimeCacheable(pathname) {
  return RUNTIME_CACHEABLE_PATTERNS.some((pattern) => pattern.test(pathname));
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(PRECACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await caches.match(request)) || (await caches.match('/index.html'));
    return cached || caches.match('/offline.html');
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== PRECACHE_NAME && name !== RUNTIME_CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isRuntimeCacheable(url.pathname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE_NAME));
    return;
  }

  event.respondWith(cacheFirst(request, PRECACHE_NAME));
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SW_VERSION,
    PRECACHE_NAME,
    RUNTIME_CACHE_NAME,
    PRECACHE_URLS,
    isRuntimeCacheable,
  };
}
