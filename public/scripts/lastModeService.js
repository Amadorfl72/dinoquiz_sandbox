'use strict';

/**
 * Last-selected mode persistence (TRIOFSND-230).
 *
 * Remembers which game mode (MODE_IDS in public/scripts/modesCatalog.js) the
 * player picked last, so the illustrated mode selector
 * (public/scripts/modeSelectorScreen.js, TRIOFSND-231) can mark it and
 * default back to it instead of the catalog's first entry. Client-only,
 * namespaced under `dinoquiz:` per the PRD's local-state constraint --
 * stores nothing but the mode id string, never name/age/progress, and is
 * never transmitted anywhere (PRD out_of_scope: "Analítica remota").
 *
 * Deliberately plain localStorage rather than src/services/storage's
 * IndexedDB-with-fallback client: a single "which mode was last picked"
 * string doesn't need that machinery, and this mirrors the same
 * direct-localStorage pattern public/scripts/main.js already uses for the
 * `dinoquiz:muted`/`dinoquiz:adsRemoved` flags.
 *
 * Browser bridge (TRIOFSND-231): follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as public/scripts/homeScreen.js so the mode
 * selector can load it as a plain `<script>` (see public/index.html) with no
 * bundler. The canonical `src/services/lastModeService.js` re-exports this
 * file so Node/Jest keep a single source of truth.
 */

(function () {
  var LAST_MODE_STORAGE_KEY = 'dinoquiz:lastMode';

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

  /**
   * Reads the last-selected mode id. Returns null if none was ever recorded,
   * storage is unavailable, or the stored value is corrupted/not a non-empty
   * string -- never throws, so a caller can always fall back to the catalog's
   * default mode.
   */
  function getLastMode(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return null;
    }

    try {
      var raw = storage.getItem(LAST_MODE_STORAGE_KEY);
      if (raw === null) {
        return null;
      }
      var modeId = JSON.parse(raw);
      return typeof modeId === 'string' && modeId.length > 0 ? modeId : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Persists `modeId` as the last-selected mode. Resolves to true if the write
   * succeeded, false if `modeId` isn't a non-empty string or storage is
   * unavailable/throws (e.g. private-mode quota) -- the caller keeps working
   * either way, this only reports whether the choice will be remembered next
   * time.
   */
  function setLastMode(modeId, storageAdapter) {
    if (typeof modeId !== 'string' || modeId.length === 0) {
      return false;
    }

    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(LAST_MODE_STORAGE_KEY, JSON.stringify(modeId));
      return true;
    } catch (error) {
      return false;
    }
  }

  var api = {
    getLastMode: getLastMode,
    setLastMode: setLastMode,
    LAST_MODE_STORAGE_KEY: LAST_MODE_STORAGE_KEY,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.lastMode = api;
  }
})();
