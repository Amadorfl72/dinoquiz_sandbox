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
 * `renderHome`'s optional `storage` argument wires the first-run '¡Jugar!'
 * tooltip (TRIOFSND-65) to `src/services/storage`: when given, it resolves
 * whether the tooltip was already dismissed on this device and passes the
 * persistence/analytics callbacks through to `renderHomeScreen`. It is only
 * ever resolved via `loadDinoQuizStorage`, which requires the CommonJS
 * service module — available under Node/Jest, a no-op in a real unbundled
 * browser — so `renderHome` degrades to its previous, tooltip-less
 * behaviour when no `storage` is supplied.
 */
(function () {
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

  function loadDinoQuizStorage(requireFn) {
    requireFn = requireFn || (typeof require === 'function' ? require : undefined);

    if (typeof requireFn !== 'function') {
      return null;
    }

    try {
      return requireFn('../../src/services/storage').dinoQuizStorage;
    } catch (error) {
      return null;
    }
  }

  function renderHome(doc, renderHomeScreen, fetchFn, storage) {
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
      var renderOptions = strings ? { strings: strings } : {};

      if (!storage) {
        return renderHomeScreen(container, renderOptions);
      }

      return storage.hasSeenHomeTooltip().then(function (seen) {
        renderOptions.showTooltip = !seen;
        renderOptions.onTooltipDismiss = function () {
          storage.markHomeTooltipSeen();
        };
        renderOptions.onPlayButtonClick = function () {
          storage.recordEventOnce('first_tap_jugar');
        };
        return renderHomeScreen(container, renderOptions);
      });
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('load', function () {
      registerServiceWorker();
      renderHome(undefined, undefined, undefined, loadDinoQuizStorage());
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      registerServiceWorker: registerServiceWorker,
      loadHomeStrings: loadHomeStrings,
      loadDinoQuizStorage: loadDinoQuizStorage,
      renderHome: renderHome,
    };
  }
})();
