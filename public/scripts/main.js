/**
 * DinoQuiz app shell bootstrap.
 *
 * Registers the service worker so the app shell, images, sounds and
 * question JSON get cached for 100% offline play (see /public/service-worker.js),
 * then renders the Home ("Inicio") screen into #app so the title, mascot
 * illustration and '¡Jugar!' button are actually visible on load (see
 * public/scripts/homeScreen.js, loaded before this file in index.html).
 *
 * A minimal hash router (no bundler, no server-side rewrites needed — works
 * offline behind the service worker) switches #app between Home and the
 * Privacy policy screen (public/scripts/privacyPolicyScreen.js, TRIOFSND-116):
 * the Home privacy icon sets `location.hash` to `PRIVACY_POLICY_HASH`, the
 * policy screen's back button clears it, and a single `hashchange` listener
 * re-renders the matching screen either way — so opening the policy from
 * Home is exactly one tap, and coming back is exactly one tap.
 *
 * `registerServiceWorker`/`loadHomeStrings`/`renderHome`/`renderRoute` accept
 * explicit overrides so each is unit-testable under Node without touching the
 * global `navigator`/`document`/`fetch`/`location`.
 */
(function () {
  var PRIVACY_POLICY_HASH = '#/privacidad';

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

  function fetchI18nResource(fetchFn, resourcePath) {
    fetchFn = fetchFn || (typeof fetch === 'function' ? fetch : undefined);
    resourcePath = resourcePath || '/i18n/es.json';

    if (typeof fetchFn !== 'function') {
      return Promise.resolve(null);
    }

    return fetchFn(resourcePath)
      .then(function (response) {
        return response.json();
      })
      .catch(function (error) {
        console.error('DinoQuiz: failed to load the i18n resource', error);
        return null;
      });
  }

  function loadHomeStrings(fetchFn, resourcePath) {
    return fetchI18nResource(fetchFn, resourcePath).then(function (data) {
      return data && data.home;
    });
  }

  function loadPrivacyPolicyStrings(fetchFn, resourcePath) {
    return fetchI18nResource(fetchFn, resourcePath).then(function (data) {
      return data && data.privacyPolicy;
    });
  }

  function navigateToPrivacyPolicy(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    if (loc) {
      loc.hash = PRIVACY_POLICY_HASH;
    }
  }

  function navigateHome(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    if (loc) {
      loc.hash = '';
    }
  }

  function isPrivacyPolicyRoute(loc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : undefined);
    return !!loc && loc.hash === PRIVACY_POLICY_HASH;
  }

  function renderHome(doc, renderHomeScreen, fetchFn, onOpenPrivacyPolicy) {
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
      if (typeof onOpenPrivacyPolicy === 'function') {
        options.onOpenPrivacyPolicy = onOpenPrivacyPolicy;
      }
      return renderHomeScreen(container, options);
    });
  }

  function renderPrivacyPolicy(doc, renderPrivacyPolicyScreen, fetchFn, onBack) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    renderPrivacyPolicyScreen =
      renderPrivacyPolicyScreen ||
      (typeof window !== 'undefined' &&
        window.DinoQuiz &&
        window.DinoQuiz.screens &&
        window.DinoQuiz.screens.renderPrivacyPolicyScreen);

    if (!doc || typeof renderPrivacyPolicyScreen !== 'function') {
      return Promise.resolve(null);
    }

    var container = doc.getElementById('app');
    if (!container) {
      return Promise.resolve(null);
    }

    return loadPrivacyPolicyStrings(fetchFn).then(function (strings) {
      var options = strings ? { strings: strings } : {};
      if (typeof onBack === 'function') {
        options.onBack = onBack;
      }
      return renderPrivacyPolicyScreen(container, options);
    });
  }

  function renderRoute(doc, fetchFn, loc) {
    if (isPrivacyPolicyRoute(loc)) {
      return renderPrivacyPolicy(doc, undefined, fetchFn, function () {
        navigateHome(loc);
      });
    }

    return renderHome(doc, undefined, fetchFn, function () {
      navigateToPrivacyPolicy(loc);
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('load', function () {
      registerServiceWorker();
      renderRoute();
    });
    window.addEventListener('hashchange', function () {
      renderRoute();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      PRIVACY_POLICY_HASH: PRIVACY_POLICY_HASH,
      registerServiceWorker: registerServiceWorker,
      loadHomeStrings: loadHomeStrings,
      loadPrivacyPolicyStrings: loadPrivacyPolicyStrings,
      navigateToPrivacyPolicy: navigateToPrivacyPolicy,
      navigateHome: navigateHome,
      isPrivacyPolicyRoute: isPrivacyPolicyRoute,
      renderHome: renderHome,
      renderPrivacyPolicy: renderPrivacyPolicy,
      renderRoute: renderRoute,
    };
  }
})();
