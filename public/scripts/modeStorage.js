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
 * Registry validation (TRIOFSND-234): `getLastMode` cross-checks the stored
 * id against modesCatalog.js's MODES_CATALOG and its live availability
 * evaluator before returning it, so a stale id (a mode that was renamed,
 * removed, or has since become blocked -- e.g. Oído Jurásico before enough
 * creature sounds ship) never comes back as "the last mode". This keeps the
 * validation in one place instead of duplicating it as a second storage
 * concept: the mode selector's naive `mode.id === lastMode` equality check
 * (public/scripts/modeSelectorScreen.js) is only ever correct because
 * `getLastMode` itself already returns null for anything that shouldn't be
 * highlighted.
 *
 * Browser bridge (TRIOFSND-231): follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as public/scripts/homeScreen.js so the mode
 * selector can load it as a plain `<script>` (see public/index.html) with no
 * bundler. The canonical `src/services/modeStorage.js` re-exports this
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

  function resolveModesCatalog() {
    if (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.modesCatalog) {
      return window.DinoQuiz.game.modesCatalog;
    }
    if (typeof require === 'function') {
      try {
        return require('./modesCatalog');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * True only if `modeId` is both a real entry in MODES_CATALOG and currently
   * playable per its requirements -- an unknown id or a known-but-blocked one
   * both fail closed (false), never throwing so a resolver problem just means
   * "don't highlight anything" instead of crashing the selector.
   */
  function isKnownAndAvailable(modeId, modesCatalog) {
    var catalog = modesCatalog || resolveModesCatalog();
    if (!catalog) {
      return false;
    }

    try {
      var mode = catalog.getModeById(modeId);
      if (!mode) {
        return false;
      }
      var verdict = catalog.evaluateModeAvailability(mode, catalog.buildCurrentResourceCatalog());
      return !!(verdict && verdict.available);
    } catch (error) {
      return false;
    }
  }

  /**
   * Reads the last-selected mode id. Returns null if none was ever recorded,
   * storage is unavailable, the stored value is corrupted/not a non-empty
   * string, or the id doesn't exist in MODES_CATALOG / isn't currently
   * available -- never throws, so a caller can always fall back to the
   * catalog's default mode. `modesCatalog` is an optional override, mirroring
   * `storageAdapter`, so callers/tests can inject a fake registry instead of
   * depending on the real one.
   */
  function getLastMode(storageAdapter, modesCatalog) {
    var storage = resolveStorage(storageAdapter);
    if (!storage) {
      return null;
    }

    var modeId;
    try {
      var raw = storage.getItem(LAST_MODE_STORAGE_KEY);
      if (raw === null) {
        return null;
      }
      var parsed = JSON.parse(raw);
      modeId = typeof parsed === 'string' && parsed.length > 0 ? parsed : null;
    } catch (error) {
      return null;
    }

    if (!modeId) {
      return null;
    }

    return isKnownAndAvailable(modeId, modesCatalog) ? modeId : null;
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
    window.DinoQuiz.services.modeStorage = api;
  }
})();
