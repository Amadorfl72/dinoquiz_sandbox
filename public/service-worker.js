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
 *
 * src/data/modeResourceManifest.js declares, per game mode, every script/
 * i18n/image/audio/fallback resource it needs -- PRECACHE_URLS below must
 * stay a superset of that manifest (one entry per resource); see that
 * module's test for the completeness check.
 */
const SW_VERSION = 'v55';
const PRECACHE_NAME = `dinoquiz-precache-${SW_VERSION}`;
const RUNTIME_CACHE_NAME = `dinoquiz-runtime-${SW_VERSION}`;

// Posted to every client once `activate` finishes (see the listener below):
// this is the point precache is guaranteed fully populated, since `install`'s
// `cache.addAll(PRECACHE_URLS)` must already have succeeded (and won
// `skipWaiting`) before `activate` can fire at all. main.js's
// public/scripts/offlineStatus.js records SW_VERSION/the timestamp locally
// when it receives this message (TRIOFSND-305).
const SW_ACTIVATE_COMPLETE_MESSAGE_TYPE = 'dinoquiz:sw-activate-complete';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/main.css',
  '/scripts/scoring.js',
  '/scripts/soundService.js',
  '/scripts/adsService.js',
  '/scripts/gameFlow.js',
  '/scripts/roundContract.js',
  '/scripts/visibilityPauseService.js',
  '/scripts/audio.js',
  '/scripts/feedbackComponent.js',
  '/scripts/network.js',
  '/scripts/logging.js',
  '/scripts/diagnosticsService.js',
  '/scripts/roundDiagnosticsService.js',
  '/scripts/a11yAnnouncer.js',
  '/scripts/appShell.js',
  '/scripts/homeScreen.js',
  '/scripts/privacyPolicyScreen.js',
  '/scripts/ageGateScreen.js',
  '/scripts/nicknameService.js',
  '/scripts/nicknameScreen.js',
  '/scripts/nicknameService.js',
  '/scripts/hallOfFameService.js',
  '/scripts/imageStyleService.js',
  '/scripts/questionScreen.js',
  '/scripts/mazeGenerator.js',
  '/scripts/mazeGame.js',
  '/scripts/mazeScreen.js',
  '/scripts/parejasGame.js',
  '/scripts/parejasScreen.js',
  '/scripts/sizeOrderGame.js',
  '/scripts/sizeOrderScreen.js',
  '/scripts/classifyGame.js',
  '/scripts/classifyTimer.js',
  '/scripts/classifyScreen.js',
  '/scripts/shadowGuessGame.js',
  '/scripts/shadowGuessScreen.js',
  '/scripts/timelineScreen.js',
  '/scripts/oidoJurasicoScreen.js',
  '/scripts/resultsScreen.js',
  '/scripts/hallOfFameService.js',
  '/scripts/hallOfFameScreen.js',
  '/scripts/modesCatalog.js',
  '/scripts/unlockThresholds.js',
  '/scripts/modeStorage.js',
  '/scripts/modeProgressStorage.js',
  '/scripts/analytics.js',
  '/scripts/modeSelectorScreen.js',
  '/scripts/modeChangeConfirmScreen.js',
  '/scripts/modeBlockedScreen.js',
  '/scripts/modeFallbackWarningScreen.js',
  '/scripts/oidoJurasicoAudioService.js',
  '/scripts/offlineStatus.js',
  '/scripts/diagnostics.js',
  '/scripts/diagnosticsScreen.js',
  '/scripts/productGoals.js',
  '/scripts/launchGateScreen.js',
  '/scripts/modeResourceValidation.js',
  '/scripts/offlineDiagnosticsPanel.js',
  '/scripts/main.js',
  '/icons/icon.svg',
  '/assets/images/mascot.svg',
  '/assets/images/dinosaurs/trex.svg',
  '/assets/images/dinosaurs/triceratops.svg',
  '/assets/images/dinosaurs/velociraptor.svg',
  '/assets/images/dinosaurs/estegosaurio.svg',
  '/assets/images/dinosaurs/braquiosaurio.svg',
  '/assets/images/dinosaurs/ankylosaurus.svg',
  '/assets/images/dinosaurs/pteranodon.svg',
  // Levels 6-10 (TRIOFSND-202): seven additional dinosaurs.
  '/assets/images/dinosaurs/spinosaurus.svg',
  '/assets/images/dinosaurs/dilophosaurus.svg',
  '/assets/images/dinosaurs/pachycephalosaurus.svg',
  '/assets/images/dinosaurs/compsognathus.svg',
  '/assets/images/dinosaurs/diplodocus.svg',
  '/assets/images/dinosaurs/iguanodon.svg',
  '/assets/images/dinosaurs/parasaurolophus.svg',
  // Realistic photo-style variants (TRIOFSND-195): precached alongside the
  // cartoon drawings so a player can toggle between visual variants offline
  // after the first load, without waiting on a runtime fetch.
  '/assets/images/realistic/trex.jpg',
  '/assets/images/realistic/triceratops.jpg',
  '/assets/images/realistic/velociraptor.jpg',
  '/assets/images/realistic/estegosaurio.jpg',
  '/assets/images/realistic/braquiosaurio.jpg',
  '/assets/images/realistic/ankylosaurus.jpg',
  '/assets/images/realistic/pteranodon.jpg',
  // Levels 6-10 realistic variants (licensed paleoart, see
  // public/assets/images/realistic/CREDITS.md).
  '/assets/images/realistic/spinosaurus.jpg',
  '/assets/images/realistic/dilophosaurus.jpg',
  '/assets/images/realistic/pachycephalosaurus.jpg',
  '/assets/images/realistic/compsognathus.jpg',
  '/assets/images/realistic/diplodocus.jpg',
  '/assets/images/realistic/iguanodon.jpg',
  '/assets/images/realistic/parasaurolophus.jpg',
  // Fallback images shown when a realistic variant fails to load.
  '/assets/images/fallback/trex.svg',
  '/assets/images/fallback/triceratops.svg',
  '/assets/images/fallback/velociraptor.svg',
  '/assets/images/fallback/estegosaurio.svg',
  '/assets/images/fallback/braquiosaurio.svg',
  '/assets/images/fallback/ankylosaurus.svg',
  '/assets/images/fallback/pteranodon.svg',
  // Levels 6-10 dinosaurs reuse this single generic fallback instead of a
  // new per-dinosaur asset (see public/assets/images/fallback/CREDITS.md).
  '/assets/images/fallback/generic.svg',
  // Parejas jurásicas card art (TRIOFSND-274): the shared card back plus
  // the fourteen dinosaur fronts already precached above under
  // /assets/images/dinosaurs/.
  '/assets/images/cards/back.svg',
  // Mode selector card illustrations (TRIOFSND-232): precached so the
  // selector renders fully offline right after install, before any of these
  // would otherwise be fetched at runtime.
  '/assets/images/modes/quiz.svg',
  '/assets/images/modes/laberinto.svg',
  '/assets/images/modes/sombra.svg',
  '/assets/images/modes/oidoJurasico.svg',
  '/assets/images/modes/parejas.svg',
  '/assets/images/modes/clasifica.svg',
  '/assets/images/modes/ordenaPorTamano.svg',
  '/assets/images/modes/lineaDelTiempo.svg',
  // Timeline period illustrations (TRIOFSND-295): precached so the period
  // selection in Línea del tiempo has its three visual supports available
  // offline right after install, before any of these would otherwise be
  // fetched at runtime.
  '/assets/images/periods/triasico.svg',
  '/assets/images/periods/jurasico.svg',
  '/assets/images/periods/cretacico.svg',
  // Feedback sound effects (TRIOFSND-78, AC-5): precached with the rest of
  // the app shell instead of left to runtime caching, so the very first
  // answer in a fresh install can still play its sfx within the <300ms
  // budget while offline.
  '/assets/sounds/correct.wav',
  '/assets/sounds/incorrect.wav',
  '/assets/sounds/fail-neutral.wav',
  // Oído Jurásico "imagined" creature sounds (TRIOFSND-268): synthesized
  // original audio, never a real recording (see
  // public/assets/sounds/oido-jurasico/CREDITS.md). Precached so the mode
  // works fully offline right after install instead of waiting on the
  // runtime cache-first rule for /assets/sounds/ below to catch the first
  // play. The i18n copy that introduces them ("sonido imaginado" notice,
  // playback strings) already lives inside i18n/es.json, precached below.
  '/assets/sounds/oido-jurasico/ankylosaurus.wav',
  '/assets/sounds/oido-jurasico/braquiosaurio.wav',
  '/assets/sounds/oido-jurasico/compsognathus.wav',
  '/assets/sounds/oido-jurasico/dilophosaurus.wav',
  '/assets/sounds/oido-jurasico/diplodocus.wav',
  '/assets/sounds/oido-jurasico/estegosaurio.wav',
  '/assets/sounds/oido-jurasico/iguanodon.wav',
  '/assets/sounds/oido-jurasico/pachycephalosaurus.wav',
  '/assets/sounds/oido-jurasico/parasaurolophus.wav',
  '/assets/sounds/oido-jurasico/pteranodon.wav',
  '/assets/sounds/oido-jurasico/spinosaurus.wav',
  '/assets/sounds/oido-jurasico/trex.wav',
  '/assets/sounds/oido-jurasico/triceratops.wav',
  '/assets/sounds/oido-jurasico/velociraptor.wav',
  '/i18n/es.json',
  '/data/questions.json',
  // Creature catalog (TRIOFSND-222): verified per-creature facts (diet,
  // length, era, habitat, classification, sources) other modes will read
  // instead of each re-deriving/duplicating a fact per creature.
  '/data/creatures.json',
  // Launch-gate status report (TRIOFSND-325): the ten launchGate.js gate
  // results, precomputed at release time by
  // scripts/generateLaunchGateReport.js and fetched by main.js for the
  // hidden diagnostic screen -- see that script's own doc comment for why
  // this can't instead be evaluated live in a no-bundler browser.
  '/data/launchGateReport.json',
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
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: SW_ACTIVATE_COMPLETE_MESSAGE_TYPE, version: SW_VERSION });
        });
      })
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
    SW_ACTIVATE_COMPLETE_MESSAGE_TYPE,
    isRuntimeCacheable,
  };
}
