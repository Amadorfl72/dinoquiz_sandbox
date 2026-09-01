'use strict';

/**
 * Per-mode local persistence of level progress, last result and unlock
 * counts (TRIOFSND-250, PRD "Progresión independiente por modo").
 *
 * Each mode gets its own namespaced key (`dinoquiz:modeProgress:<modeId>`),
 * so progress for one mode never reads, overwrites or resets another's --
 * unlike StorageClient.js's single, mode-agnostic `maxUnlockedLevel`, this
 * is designed for the eight independently-progressing modes from the start.
 *
 * `recordLevelUnlocked` is monotonic per mode (mirrors StorageClient.js's
 * `setMaxUnlockedLevel`): replaying an already-cleared level recomputes the
 * same already-unlocked next level, which is never greater than the stored
 * `maxUnlockedLevel`, so it is a no-op and `unlockCount` -- incremented only
 * on a genuine advance -- is never double-counted.
 *
 * Backend fallback (IndexedDB -> localStorage -> memory) mirrors
 * StorageClient.js/GameSessionStorage.js so a mode stays playable, just
 * non-persistent, when every durable backend is unavailable. The three
 * adapters are defined locally in this file rather than shared with
 * src/services/storage/adapters/*.js -- same self-contained shape as
 * logging.js's own local `createLocalStorageAdapter`/`createMemoryAdapter` --
 * because those `src/` adapters use bare `module.exports` with no browser
 * fallback and are Node/Jest-only today.
 *
 * Browser bridge: without a bundler, the browser only runs what
 * public/index.html loads as a `<script>`; a CommonJS-only module under
 * `src/` is invisible to it. This file follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as roundDiagnosticsService.js/modeStorage.js --
 * registers on `window.DinoQuiz.services.modeProgressStorage`; the canonical
 * `src/services/storage/ModeProgressStorage.js` re-exports it so Node/Jest
 * keep a single source of truth.
 */

(function () {
  var NAMESPACE = 'dinoquiz:';
  var MODE_PROGRESS_KEY_PREFIX = NAMESPACE + 'modeProgress:';

  // Bump whenever the persisted shape below changes incompatibly. A stored
  // entry under any other version is discarded rather than migrated/guessed,
  // mirroring GameSessionStorage.js's SESSION_SCHEMA_VERSION.
  var MODE_PROGRESS_SCHEMA_VERSION = 1;

  // Every mode starts with its first level already accessible (mirrors
  // StorageClient.js's DEFAULT_STATE.maxUnlockedLevel), independently per mode.
  var DEFAULT_MAX_UNLOCKED_LEVEL = 1;

  // Stable technical code for a degraded (in-memory-only) progress write,
  // mirroring StorageClient.js's MAX_UNLOCKED_LEVEL_PERSIST_ERROR_CODE: carries
  // no metadata beyond the mode id, so it never leaks a score/level.
  var MODE_PROGRESS_PERSIST_ERROR_CODE = 'storage_mode_progress_persist_error';

  // Stable technical code for discarding a corrupted/incompatible stored entry,
  // mirroring GameSessionStorage.js's SESSION_DISCARD_INCOMPATIBLE_CODE.
  var MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE = 'storage_mode_progress_discard_incompatible';

  function modeProgressKey(modeId) {
    return MODE_PROGRESS_KEY_PREFIX + modeId;
  }

  function isValidModeId(modeId) {
    return typeof modeId === 'string' && modeId.length > 0;
  }

  function isValidLastResult(result) {
    if (!result || typeof result !== 'object') {
      return false;
    }
    if (!Number.isInteger(result.score) || result.score < 0) {
      return false;
    }
    if (!Number.isInteger(result.maxScore) || result.maxScore <= 0 || result.score > result.maxScore) {
      return false;
    }
    if (!Number.isInteger(result.percentage) || result.percentage < 0 || result.percentage > 100) {
      return false;
    }
    if (!Number.isInteger(result.stars) || result.stars < 1 || result.stars > 3) {
      return false;
    }
    return result.level === null || Number.isInteger(result.level);
  }

  function isValidProgress(value) {
    if (!value || typeof value !== 'object') {
      return false;
    }
    if (value.schemaVersion !== MODE_PROGRESS_SCHEMA_VERSION) {
      return false;
    }
    if (!Number.isInteger(value.maxUnlockedLevel) || value.maxUnlockedLevel < 1) {
      return false;
    }
    if (!Number.isInteger(value.unlockCount) || value.unlockCount < 0) {
      return false;
    }
    return value.lastResult === null || isValidLastResult(value.lastResult);
  }

  function defaultProgress() {
    return {
      schemaVersion: MODE_PROGRESS_SCHEMA_VERSION,
      maxUnlockedLevel: DEFAULT_MAX_UNLOCKED_LEVEL,
      unlockCount: 0,
      lastResult: null,
    };
  }

  // ---- Storage backends (IndexedDB -> localStorage -> memory) ----
  // Self-contained on purpose (see file doc comment): no `require` of
  // src/services/storage/adapters/*.js, so this script needs nothing beyond
  // globals every browser already provides.

  var INDEXED_DB_NAME = 'dinoquiz-storage';
  var INDEXED_DB_VERSION = 1;
  var INDEXED_DB_STORE_NAME = 'kv';
  // Some embedded/older WebViews hang on indexedDB.open instead of erroring, so
  // we bound the wait and treat a timeout as "unavailable" to keep the
  // fallback chain moving.
  var INDEXED_DB_OPEN_TIMEOUT_MS = 2000;

  function createIndexedDbAdapter() {
    var dbPromise = null;

    function openDb() {
      if (dbPromise) {
        return dbPromise;
      }

      dbPromise = new Promise(function (resolve, reject) {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('indexedDB is not available in this environment'));
          return;
        }

        var settled = false;
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          reject(new Error('indexedDB open timed out'));
        }, INDEXED_DB_OPEN_TIMEOUT_MS);

        var request;
        try {
          request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
        } catch (error) {
          clearTimeout(timer);
          reject(error);
          return;
        }

        request.onupgradeneeded = function () {
          var db = request.result;
          if (!db.objectStoreNames.contains(INDEXED_DB_STORE_NAME)) {
            db.createObjectStore(INDEXED_DB_STORE_NAME);
          }
        };

        request.onsuccess = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(request.result);
        };

        request.onerror = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(request.error || new Error('indexedDB open failed'));
        };

        request.onblocked = function () {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new Error('indexedDB open blocked by another tab'));
        };
      });

      dbPromise.catch(function () {
        // Do not cache a rejected open attempt: a later isAvailable() retry
        // (e.g. after the user exits private browsing) should try again.
        dbPromise = null;
      });

      return dbPromise;
    }

    function withStore(mode, run) {
      return openDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(INDEXED_DB_STORE_NAME, mode);
          var store = tx.objectStore(INDEXED_DB_STORE_NAME);

          var request;
          try {
            request = run(store);
          } catch (error) {
            reject(error);
            return;
          }

          request.onsuccess = function () {
            resolve(request.result);
          };
          request.onerror = function () {
            reject(request.error || new Error('indexedDB request failed'));
          };
        });
      });
    }

    return {
      name: 'indexedDB',
      isAvailable: function () {
        return openDb().then(
          function () {
            return true;
          },
          function () {
            return false;
          }
        );
      },
      getItem: function (key) {
        return withStore('readonly', function (store) {
          return store.get(key);
        }).then(function (result) {
          return result === undefined ? null : result;
        });
      },
      setItem: function (key, value) {
        return withStore('readwrite', function (store) {
          return store.put(value, key);
        });
      },
      removeItem: function (key) {
        return withStore('readwrite', function (store) {
          return store.delete(key);
        });
      },
    };
  }

  var LOCAL_STORAGE_PROBE_KEY = '__dinoquiz_storage_probe__';

  function getLocalStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available in this environment');
    }
    return window.localStorage;
  }

  function createLocalStorageAdapter() {
    return {
      name: 'localStorage',
      isAvailable: function () {
        try {
          var storage = getLocalStorage();
          // Safari private mode exposes localStorage but throws on write (quota
          // = 0), so availability can only be confirmed with a real
          // write/remove probe.
          storage.setItem(LOCAL_STORAGE_PROBE_KEY, '1');
          storage.removeItem(LOCAL_STORAGE_PROBE_KEY);
          return Promise.resolve(true);
        } catch (error) {
          return Promise.resolve(false);
        }
      },
      getItem: function (key) {
        return Promise.resolve(getLocalStorage().getItem(key));
      },
      setItem: function (key, value) {
        getLocalStorage().setItem(key, value);
        return Promise.resolve();
      },
      removeItem: function (key) {
        getLocalStorage().removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // Last-resort backend: keeps the game playable when both IndexedDB and
  // localStorage are unavailable, but nothing survives a reload (degraded mode).
  function createMemoryAdapter() {
    var store = {};

    return {
      name: 'memory',
      isAvailable: function () {
        return Promise.resolve(true);
      },
      getItem: function (key) {
        return Promise.resolve(Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null);
      },
      setItem: function (key, value) {
        store[key] = value;
        return Promise.resolve();
      },
      removeItem: function (key) {
        delete store[key];
        return Promise.resolve();
      },
    };
  }

  function defaultAdapters() {
    return [createIndexedDbAdapter(), createLocalStorageAdapter(), createMemoryAdapter()];
  }

  /** Resolves logging.js's LogService the same dual pattern mazeGame.js's own resolveDefaultLogService uses. */
  function resolveLogServiceCtor() {
    if (typeof require === 'function') {
      return require('../../src/services/logging').LogService;
    }
    return (
      (typeof window !== 'undefined' &&
        window.DinoQuiz &&
        window.DinoQuiz.services &&
        window.DinoQuiz.services.logging &&
        window.DinoQuiz.services.logging.LogService) ||
      null
    );
  }

  var noopLogService = {
    logEvent: function () {},
    logStateDiscarded: function () {},
  };

  function createDefaultLogService() {
    var LogServiceCtor = resolveLogServiceCtor();
    return typeof LogServiceCtor === 'function' ? new LogServiceCtor() : noopLogService;
  }

  var noopDiagnostics = { incrementCounter: function () {}, recordError: function () {} };

  /** Resolves src/services/diagnostics.js the same require-or-`window.DinoQuiz` shape as resolveLogServiceCtor above, falling back to a no-op. */
  function createDefaultDiagnostics() {
    if (typeof require === 'function') {
      return require('../../src/services/diagnostics');
    }
    var diagnosticsModule =
      typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.diagnostics;
    return diagnosticsModule && typeof diagnosticsModule.incrementCounter === 'function' ? diagnosticsModule : noopDiagnostics;
  }

  /** Resolves scoring.js's `normalizeOutcome`, same dual pattern as resultsScreen.js/mazeGame.js's own resolveScoring. */
  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  /**
   * Per-mode local persistence of level progress, last result and unlock
   * counts. `adapters` and `logService` are optional overrides (mirrors
   * StorageClient.js's constructor) so tests can inject fakes instead of
   * depending on the real backends/logger.
   */
  function ModeProgressStorage(adapters, logService, diagnosticsService) {
    this._adapters = adapters || defaultAdapters();
    this._logService = logService || createDefaultLogService();
    this._diagnostics = diagnosticsService || createDefaultDiagnostics();
    this._activeAdapter = null;
    this._initPromise = null;

    // Aggregated, non-PII observability counters only (mirrors StorageClient.js).
    this._failureCount = 0;
    this._lastErrorAt = null;
  }

  ModeProgressStorage.prototype.init = function () {
    if (!this._initPromise) {
      this._initPromise = this._doInit();
    }
    return this._initPromise;
  };

  ModeProgressStorage.prototype._doInit = async function () {
    for (var i = 0; i < this._adapters.length; i++) {
      var adapter = this._adapters[i];
      try {
        if (await adapter.isAvailable()) {
          this._activeAdapter = adapter;
          return;
        }
      } catch (error) {
        this._recordFailure();
      }
    }
    this._activeAdapter = createMemoryAdapter();
  };

  ModeProgressStorage.prototype._recordFailure = function () {
    this._failureCount += 1;
    this._lastErrorAt = Date.now();
  };

  /** Same degrade-on-failure write shape as GameSessionStorage.js#write. */
  ModeProgressStorage.prototype._write = async function (modeId, value) {
    await this.init();

    var activeIndex = this._activeAdapter ? this._adapters.indexOf(this._activeAdapter) : -1;
    var candidates = this._adapters.slice(Math.max(activeIndex, 0));

    for (var i = 0; i < candidates.length; i++) {
      var adapter = candidates[i];
      try {
        if (adapter !== this._activeAdapter && !(await adapter.isAvailable())) {
          continue;
        }
        await adapter.setItem(modeProgressKey(modeId), JSON.stringify(value));
        this._activeAdapter = adapter;
        return true;
      } catch (error) {
        this._recordFailure();
      }
    }

    this._activeAdapter = createMemoryAdapter();
    return false;
  };

  ModeProgressStorage.prototype._readRaw = async function (modeId) {
    await this.init();
    try {
      return await this._activeAdapter.getItem(modeProgressKey(modeId));
    } catch (error) {
      this._recordFailure();
      return null;
    }
  };

  /**
   * Resolves to `modeId`'s stored progress, or the default (level 1
   * unlocked, no unlocks yet, no last result) when nothing was ever saved.
   * A corrupted or incompatible-schema entry is discarded (never guessed at
   * or migrated) and logged via the aggregated, data-free
   * `MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE` counter, mirroring
   * GameSessionStorage.js#restoreSession.
   */
  ModeProgressStorage.prototype.getProgress = async function (modeId) {
    if (!isValidModeId(modeId)) {
      return defaultProgress();
    }

    var raw = await this._readRaw(modeId);
    if (raw === null) {
      return defaultProgress();
    }

    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      // Falls through to the discard-and-default path below.
    }

    if (!isValidProgress(parsed)) {
      this._logService.logStateDiscarded(modeId, MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE);
      // TRIOFSND-318, PRD failure point "estado de partida descartado": the
      // stable discard code alone, never the discarded entry's own content.
      this._diagnostics.recordError(modeId, 'state', MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE);
      return defaultProgress();
    }

    return parsed;
  };

  /** Highest level (1-based) unlocked for `modeId` on this device so far. */
  ModeProgressStorage.prototype.getMaxUnlockedLevel = async function (modeId) {
    var progress = await this.getProgress(modeId);
    return progress.maxUnlockedLevel;
  };

  /** Count of distinct levels unlocked for `modeId` on this device so far. */
  ModeProgressStorage.prototype.getUnlockCount = async function (modeId) {
    var progress = await this.getProgress(modeId);
    return progress.unlockCount;
  };

  /** `modeId`'s most recently persisted result, or null if it has never finished a game. */
  ModeProgressStorage.prototype.getLastResult = async function (modeId) {
    var progress = await this.getProgress(modeId);
    return progress.lastResult;
  };

  /**
   * Advances `modeId`'s unlocked level and its unlock counter, but only when
   * `level` is a genuine advance past what is already unlocked -- monotonic,
   * exactly mirroring StorageClient.js#setMaxUnlockedLevel. Replaying a
   * cleared level re-proposes a `level` that is never greater than the
   * current `maxUnlockedLevel`, so this is a no-op and `unlockCount` cannot
   * be double-counted.
   */
  ModeProgressStorage.prototype.recordLevelUnlocked = async function (modeId, level) {
    if (!isValidModeId(modeId) || !Number.isInteger(level)) {
      return this.getProgress(modeId);
    }

    var current = await this.getProgress(modeId);
    if (level <= current.maxUnlockedLevel) {
      return current;
    }

    var updated = Object.assign({}, current, { maxUnlockedLevel: level, unlockCount: current.unlockCount + 1 });
    var persisted = await this._write(modeId, updated);
    if (!persisted) {
      this._logService.logEvent(MODE_PROGRESS_PERSIST_ERROR_CODE);
    }
    return updated;
  };

  /**
   * Persists `modeId`'s latest finished-game result: `score`/`maxScore` plus
   * the shared 0-100 percentage/1-3 star tier derived from them via
   * scoring.js's `normalizeOutcome` (TRIOFSND-251), so every mode's result
   * lands on the same scale regardless of its own scoring representation.
   * `level` is optional (not every mode has a level chain) and stored as-is.
   * Always overwrites the previous result -- only the latest game's outcome
   * is kept, never a history of past results.
   */
  ModeProgressStorage.prototype.recordResult = async function (modeId, options) {
    options = options || {};
    if (!isValidModeId(modeId)) {
      return null;
    }

    var scoring = resolveScoring();
    if (!scoring || typeof scoring.normalizeOutcome !== 'function') {
      throw new Error('ModeProgressStorage#recordResult requires scoring.js to be available');
    }

    var normalized = scoring.normalizeOutcome(options.score, options.maxScore);
    var lastResult = {
      score: options.score,
      maxScore: options.maxScore,
      percentage: normalized.percentage,
      stars: normalized.stars,
      level: options.level === undefined ? null : options.level,
    };

    var current = await this.getProgress(modeId);
    var updated = Object.assign({}, current, { lastResult: lastResult });
    var persisted = await this._write(modeId, updated);
    if (!persisted) {
      this._logService.logEvent(MODE_PROGRESS_PERSIST_ERROR_CODE);
    }
    return lastResult;
  };

  ModeProgressStorage.prototype.getDiagnostics = function () {
    var backend = (this._activeAdapter && this._activeAdapter.name) || 'memory';
    return {
      backend: backend,
      isPersistent: backend !== 'memory',
      failureCount: this._failureCount,
      lastErrorAt: this._lastErrorAt,
    };
  };

  var api = {
    ModeProgressStorage: ModeProgressStorage,
    MODE_PROGRESS_SCHEMA_VERSION: MODE_PROGRESS_SCHEMA_VERSION,
    MODE_PROGRESS_KEY_PREFIX: MODE_PROGRESS_KEY_PREFIX,
    MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE: MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.modeProgressStorage = api;
  }
})();
