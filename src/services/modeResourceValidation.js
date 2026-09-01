'use strict';

/**
 * Per-mode resource validation (TRIOFSND-306, PRD "Todos los modos deben
 * funcionar completamente sin conexión después de instalar o actualizar la
 * PWA").
 *
 * src/data/modeResourceManifest.js already declares, per mode, every
 * script/i18n/image/audio/fallback URL that mode needs to run offline, and
 * a separate test checks that list against `public/service-worker.js`'s
 * PRECACHE_URLS at build time. This module checks the same declared list
 * against what is *actually* sitting in the browser's live Cache Storage
 * right now (`caches.match`, the same API `public/service-worker.js` itself
 * reads from) -- catching the runtime case a static PRECACHE_URLS check
 * cannot: an install that was interrupted, a cache the browser evicted
 * under storage pressure, or any other drift between "declared" and
 * "actually cached".
 *
 * `validateModeResources(modeId, options)` resolves to the (possibly empty)
 * list of declared URLs that `caches.match` could not find, so a caller
 * (e.g. a future gate in front of a mode screen) can decide whether the
 * mode is safe to enter. Every miss is tallied locally via
 * `logging.js#logModeResourceMissing(modeId, resourceUrl)` -- a
 * `dinoquiz:`-prefixed aggregated counter, never sent by `sendLogs()` (see
 * that method's own doc comment) -- and never sent anywhere else either;
 * this module makes no network requests of its own.
 *
 * When the Cache Storage API itself isn't available (`caches` missing, e.g.
 * a browser without service worker support -- see
 * src/services/platformSupport.js), there is nothing to check against, so
 * this resolves to an empty list rather than reporting every resource as
 * missing -- mirrors platformSupport.js's own "degrade to false/[] instead
 * of throwing" choice.
 */

const { getModeManifest } = require('../data/modeResourceManifest');
const { LogService } = require('./logging');
const diagnostics = require('./diagnostics');

// Stable, structured code for `diagnostics.js#recordError` (TRIOFSND-318,
// PRD failure point "recurso no cacheado"): a resource URL is a technical
// asset path, not player content, but recordError's `code` stays this one
// fixed string regardless -- the per-URL detail already lives in
// `logModeResourceMissing`'s own aggregated counters below.
const RESOURCE_NOT_CACHED_CODE = 'RESOURCE_NOT_CACHED';

function flattenManifestUrls(manifest) {
  return [...manifest.scripts, ...manifest.i18n, ...manifest.images, ...manifest.audio, ...manifest.fallback];
}

function resolveCachesApi(injected) {
  if (injected) {
    return injected;
  }
  return typeof caches !== 'undefined' ? caches : null;
}

function resolveLogService(injected) {
  if (injected) {
    return injected;
  }
  try {
    return new LogService();
  } catch (error) {
    return null;
  }
}

function resolveDiagnostics(injected) {
  return injected || diagnostics;
}

/**
 * Checks every resource `modeResourceManifest.js` declares for `modeId`
 * against the live Cache Storage and returns the URLs that are missing.
 *
 * `options.manifest` lets a caller inject a manifest directly (mirrors
 * `getModeManifest`'s own `options.catalog`/`options.dinosaurs`, forwarded
 * as-is when no manifest is given); `options.caches` and
 * `options.logService` let tests inject fakes instead of the real
 * `caches` global / a real `LogService`.
 */
async function validateModeResources(modeId, options = {}) {
  const manifest = options.manifest || getModeManifest(modeId, options);
  const urls = flattenManifestUrls(manifest);
  const cachesApi = resolveCachesApi(options.caches);

  if (!cachesApi || typeof cachesApi.match !== 'function') {
    return [];
  }

  const results = await Promise.all(
    urls.map((url) => Promise.resolve(cachesApi.match(url)).then((cached) => (cached ? null : url))),
  );
  const missing = results.filter((url) => url !== null);

  if (missing.length > 0) {
    const logService = resolveLogService(options.logService);
    if (logService) {
      missing.forEach((url) => logService.logModeResourceMissing(modeId, url));
    }

    const diagnosticsService = resolveDiagnostics(options.diagnostics);
    missing.forEach(() => diagnosticsService.recordError(modeId, 'resource', RESOURCE_NOT_CACHED_CODE));
  }

  return missing;
}

module.exports = {
  validateModeResources,
};
