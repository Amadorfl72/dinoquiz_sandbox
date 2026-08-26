'use strict';

/**
 * PWA capability detection (TRIOFSND-113).
 *
 * DinoQuiz's official support matrix is the last 2 major versions of Chrome,
 * Edge and Safari, which all support Service Worker + Web App Manifest. Some
 * older tablets and embedded/in-app browsers outside that matrix don't, so
 * this module gives the app shell (public/scripts/main.js) a single,
 * testable place to ask "can I install/cache like a PWA here?" without
 * scattering feature-detection branches across the bootstrap code.
 *
 * Nothing here throws or blocks startup: every check degrades to `false`
 * when the relevant global is missing, so the game itself never depends on
 * this module returning true. It exists purely so the app shell can skip
 * PWA-only behaviour (service worker registration) on unsupported browsers
 * while the normal browser flow (fetch the i18n/question JSON, render Inicio
 * -> Quiz -> Resultados) keeps working exactly the same either way.
 */

function isServiceWorkerSupported(nav) {
  return !!nav && 'serviceWorker' in nav;
}

/**
 * There's no direct "does this browser install manifests" API; the
 * conventional feature check is whether `<link>.relList.supports('manifest')`
 * exists and returns true. Browsers without manifest support (or without
 * `relList.supports` at all) simply ignore the `<link rel="manifest">` tag in
 * public/index.html instead of erroring, so this is diagnostic only.
 */
function isManifestSupported(doc) {
  if (!doc || typeof doc.createElement !== 'function') {
    return false;
  }

  try {
    const link = doc.createElement('link');
    return !!(link.relList && typeof link.relList.supports === 'function' && link.relList.supports('manifest'));
  } catch (error) {
    return false;
  }
}

/**
 * Aggregate capability snapshot for the current browser. `isFullySupported`
 * is true only when both the installable-manifest and service-worker/cache
 * capabilities are present -- i.e. the full PWA experience (installable,
 * offline via cache). When it's false the app must still be fully playable
 * in "modo navegador normal (sin instalación ni cache avanzada)".
 */
function detectPwaSupport(nav, doc) {
  const serviceWorker = isServiceWorkerSupported(nav);
  const manifest = isManifestSupported(doc);

  return {
    serviceWorker,
    manifest,
    isFullySupported: serviceWorker && manifest,
  };
}

module.exports = {
  isServiceWorkerSupported,
  isManifestSupported,
  detectPwaSupport,
};
