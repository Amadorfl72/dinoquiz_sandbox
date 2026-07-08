/**
 * DinoQuiz app shell bootstrap.
 *
 * Registers the service worker so the app shell, images, sounds and
 * question JSON get cached for 100% offline play (see /public/service-worker.js),
 * then renders the Home ("Inicio") screen into #app so the title, mascot
 * illustration and '¡Jugar!' button are actually visible on load (see
 * public/scripts/homeScreen.js, loaded before this file in index.html).
 *
 * `registerServiceWorker`/`loadHomeStrings`/`renderHome` accept explicit
 * overrides so each is unit-testable under Node without touching the
 * global `navigator`/`document`/`fetch`.
 *
 * Mute persistence (TRIOFSND-66): `src/services/storage` already models a
 * `muted` key with IndexedDB/localStorage/memory fallback, but it's a
 * CommonJS module graph (`require`d internally) that this no-bundler app
 * shell can't load as a plain `<script>`. `MUTE_STORAGE_KEY` below matches
 * the exact namespaced key that service writes (`dinoquiz:muted`, JSON-
 * encoded) so a future bundler-backed wiring of the real service reads back
 * the same value with no migration. Until then, this reads/writes
 * `localStorage` directly -- sufficient for a single boolean preference --
 * degrading to an in-memory default (unmuted) if `localStorage` throws
 * (e.g. Safari private mode).
 */
(function () {
  var MUTE_STORAGE_KEY = 'dinoquiz:muted';

  function loadMutedState(storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return false;
    }

    try {
      var raw = storageObj.getItem(MUTE_STORAGE_KEY);
      return raw !== null ? JSON.parse(raw) === true : false;
    } catch (error) {
      return false;
    }
  }

  function persistMutedState(muted, storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return;
    }

    try {
      storageObj.setItem(MUTE_STORAGE_KEY, JSON.stringify(muted));
    } catch (error) {
      console.error('DinoQuiz: failed to persist the mute preference', error);
    }
  }

  function registerServiceWorker(nav, swPath) {
    nav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);
    swPath = swPath || '/service-worker.js';

    if (!nav || !('serviceWorker' in nav)) {
      return Promise.resolve(null);
    }

    return nav.serviceWorker
      .register(swPath)
      .then(function (registration) {
        return registration;
      })
      .catch(function (error) {
        console.error('DinoQuiz: service worker registration failed', error);
        return null;
      });
  }

  function loadHomeStrings(fetchFn, resourcePath) {
    fetchFn = fetchFn || (typeof fetch === 'function' ? fetch : undefined);
    resourcePath = resourcePath || '/i18n/es.json';

    if (typeof fetchFn !== 'function') {
      return Promise.resolve(null);
    }

    return fetchFn(resourcePath)
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data.home;
      })
      .catch(function (error) {
        console.error('DinoQuiz: failed to load the i18n resource', error);
        return null;
      });
  }

  function renderHome(doc, renderHomeScreen, fetchFn, storageObj) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    renderHomeScreen =
      renderHomeScreen ||
      (typeof window !== 'undefined' &&
        window.DinoQuiz &&
        window.DinoQuiz.screens &&
        window.DinoQuiz.screens.renderHomeScreen);

    if (!doc || typeof renderHomeScreen !== 'function') {
      return Promise.resolve(null);
    }

    var container = doc.getElementById('app');
    if (!container) {
      return Promise.resolve(null);
    }

    return loadHomeStrings(fetchFn).then(function (strings) {
      var options = strings ? { strings: strings } : {};
      options.muted = loadMutedState(storageObj);
      options.onToggleMute = function (muted) {
        persistMutedState(muted, storageObj);
      };
      return renderHomeScreen(container, options);
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('load', function () {
      registerServiceWorker();
      renderHome();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      registerServiceWorker: registerServiceWorker,
      loadHomeStrings: loadHomeStrings,
      renderHome: renderHome,
      loadMutedState: loadMutedState,
      persistMutedState: persistMutedState,
      MUTE_STORAGE_KEY: MUTE_STORAGE_KEY,
    };
  }
})();
