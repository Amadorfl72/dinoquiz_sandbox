'use strict';

/**
 * Local SW status / last-preload tracking (TRIOFSND-305).
 *
 * Records, in localStorage, which service worker version is currently
 * active (`dinoquiz:swVersion`) and when the last precache fully completed
 * (`dinoquiz:lastPreloadAt`, ISO-8601) -- main.js's service worker `message`
 * listener calls `recordPrecacheComplete` once the SW confirms its
 * `activate` handler has finished (see public/service-worker.js posting an
 * "activate complete" message to every client), which is the point precache
 * is guaranteed fully populated: install's `cache.addAll(PRECACHE_URLS)`
 * already ran (and won `skipWaiting`) before `activate` can fire at all.
 *
 * Deliberately plain localStorage, mirroring the same direct-localStorage
 * pattern public/scripts/modeStorage.js's `dinoquiz:lastMode` and
 * public/scripts/main.js's `dinoquiz:muted` already use for small values,
 * rather than src/services/storage's IndexedDB-with-fallback client -- two
 * small strings don't need that machinery. Every read/write degrades
 * silently (never throws) so a quota error or private-mode restriction never
 * blocks the service worker registration flow.
 *
 * Browser bridge: no bundler, so this follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as modeStorage.js -- registers on
 * `window.DinoQuiz.services.offlineStatus`; the canonical
 * `src/services/offlineStatus.js` re-exports it for Node/Jest.
 */

(function () {
  var SW_VERSION_STORAGE_KEY = 'dinoquiz:swVersion';
  var LAST_PRELOAD_AT_STORAGE_KEY = 'dinoquiz:lastPreloadAt';

  function resolveStorage(storageAdapter) {
    if (storageAdapter) {
      return storageAdapter;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return null;
  }

  function readString(key, storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return null;
    }

    try {
      var raw = storage.getItem(key);
      if (raw === null) {
        return null;
      }
      var parsed = JSON.parse(raw);
      return typeof parsed === 'string' && parsed.length > 0 ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeString(key, value, storageAdapter) {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }

    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getSwVersion(storageAdapter) {
    return readString(SW_VERSION_STORAGE_KEY, storageAdapter);
  }

  function setSwVersion(version, storageAdapter) {
    return writeString(SW_VERSION_STORAGE_KEY, version, storageAdapter);
  }

  function getLastPreloadAt(storageAdapter) {
    return readString(LAST_PRELOAD_AT_STORAGE_KEY, storageAdapter);
  }

  function setLastPreloadAt(timestamp, storageAdapter) {
    return writeString(LAST_PRELOAD_AT_STORAGE_KEY, timestamp, storageAdapter);
  }

  /**
   * Records that a precache fully completed for `version`, stamping
   * `dinoquiz:swVersion`/`dinoquiz:lastPreloadAt` together so they always
   * describe the same activation. `now` is injectable (mirrors
   * a11yAnnouncer.js's `options.now`) so tests get a deterministic timestamp
   * instead of depending on the real clock; it must return an ISO-8601
   * string. Returns false without writing anything when `version` isn't a
   * non-empty string, or if either write fails (e.g. storage unavailable).
   */
  function recordPrecacheComplete(version, storageAdapter, now) {
    if (typeof version !== 'string' || version.length === 0) {
      return false;
    }

    var nowFn =
      typeof now === 'function'
        ? now
        : function () {
            return new Date().toISOString();
          };

    var versionRecorded = setSwVersion(version, storageAdapter);
    var timestampRecorded = writeString(LAST_PRELOAD_AT_STORAGE_KEY, nowFn(), storageAdapter);
    return versionRecorded && timestampRecorded;
  }

  var api = {
    SW_VERSION_STORAGE_KEY: SW_VERSION_STORAGE_KEY,
    LAST_PRELOAD_AT_STORAGE_KEY: LAST_PRELOAD_AT_STORAGE_KEY,
    getSwVersion: getSwVersion,
    setSwVersion: setSwVersion,
    getLastPreloadAt: getLastPreloadAt,
    setLastPreloadAt: setLastPreloadAt,
    recordPrecacheComplete: recordPrecacheComplete,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.offlineStatus = api;
  }
})();
