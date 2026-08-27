'use strict';

/**
 * Structured logging service for DinoQuiz (browser-compatible version).
 *
 * Collects and stores structured logs for user access and PWA installation
 * attempts. This version is loaded as a plain <script> in the browser and
 * registers itself on window.DinoQuiz, while also exporting via CommonJS
 * for Node/Jest testing.
 *
 * Supports transmission to a backend via `sendLogs(endpointUrl, options)`
 * which POSTs accumulated logs as JSON. Logs are cleared after successful
 * transmission unless `clearOnSuccess: false` is passed in options.
 *
 * Diagnostics counters (TRIOFSND-230): `logSelectorOpen()`/
 * `getSelectorOpenCount()` track an aggregated, local-only tally of mode
 * selector opens (never sent via sendLogs), and `logModeBlocked(modeId,
 * cause)`/`getModeBlockedLogs()` record a structured `mode_blocked` entry
 * when a mode is blocked, stored under its own local-only key -- never
 * pushed into the transmittable log array, so it is never sent via
 * sendLogs either.
 *
 * Laberinto diagnostics (TRIOFSND-259): the same aggregated, local-only,
 * never-transmitted pattern extended to the Laberinto mode -- `logMazeGameStarted`/
 * `logMazeGameCompleted`/`logMazeGameAbandoned` each tally a per-level count
 * (keyed by the maze difficulty level, `dinoquiz:mazeGamesStartedByLevel` and
 * friends) so a parent/dev can see how many Laberinto games were started vs.
 * actually finished vs. left mid-game at each level, and
 * `logMazeResolvabilityFailure`/`getMazeResolvabilityFailureCount` tally how
 * many times a maze/round could not be generated as solvable (mirrors the
 * raw `maze_generation_failed`/`maze_round_generation_failed` events already
 * logged by src/game/mazeGenerator.js/public/scripts/mazeGame.js, as a single
 * aggregated counter instead of the full per-event log).
 *
 * Mode-change abandon diagnostics (TRIOFSND-239): `logGameAbandonedByMode(modeId)`/
 * `getGamesAbandonedByMode()` tally, per mode id, how many times a player
 * confirmed "cambiar de juego" (public/scripts/modeChangeConfirmScreen.js)
 * while a round was still incomplete (public/scripts/main.js, driven by
 * src/services/gameSessionStorage.js's `hasIncompleteGame`) -- the same
 * aggregated, local-only, never-transmitted counter shape as the Laberinto
 * per-level tallies above, but keyed by mode id instead of level, so it
 * covers every mode (Laberinto keeps its own separate per-level counters
 * for navigating away outright, which this never duplicates or replaces).
 *
 * Round-contract diagnostics (TRIOFSND-246, PRD "Diagnóstico y métricas
 * agregadas almacenadas únicamente en el dispositivo"): generalizes the
 * Laberinto-only per-level counters above to every mode. `logRoundGameStarted
 * (modeId, level)`/`logRoundGameCompleted(modeId, level)`/
 * `logRoundGameAbandoned(modeId, level)` each tally a per-"modeId:level"
 * aggregated count (public/scripts/roundDiagnosticsService.js drives these
 * from src/game/roundContract.js's session hooks), and
 * `logRoundGenerationFailure(modeId, code)`/`logStateDiscarded(modeId, code)`
 * each tally a per-"modeId:code" aggregated count of a stable, machine-
 * readable local failure code -- never any round content (no prompts,
 * creature ids, seeds or answers) -- for a round a mode's own generator
 * could not build (mirrors the existing `maze_generation_failed`/
 * `size_order_round_generation_failed` codes) or a persisted game session
 * src/services/storage/GameSessionStorage.js had to discard as incompatible.
 * Same aggregated, local-only, never-transmitted-by-sendLogs shape as every
 * counter above.
 *
 * Browser bridge: Without a bundler, this follows the dual CommonJS/global
 * pattern as public/scripts/audio.js — registers on window.DinoQuiz for
 * the browser and module.exports for Node/Jest. The canonical
 * src/services/logging/index.js re-exports this file.
 */

(function () {
  var LOGS_STORAGE_KEY = 'dinoquiz:logs';
  var SELECTOR_OPEN_COUNT_KEY = 'dinoquiz:selectorOpenCount';
  var MODE_BLOCKED_LOGS_STORAGE_KEY = 'dinoquiz:modeBlockedLogs';
  var MAZE_GAMES_STARTED_KEY = 'dinoquiz:mazeGamesStartedByLevel';
  var MAZE_GAMES_COMPLETED_KEY = 'dinoquiz:mazeGamesCompletedByLevel';
  var MAZE_GAMES_ABANDONED_KEY = 'dinoquiz:mazeGamesAbandonedByLevel';
  var MAZE_RESOLVABILITY_FAILURE_COUNT_KEY = 'dinoquiz:mazeResolvabilityFailureCount';
  var GAMES_ABANDONED_BY_MODE_KEY = 'dinoquiz:gamesAbandonedByMode';
  var ROUND_GAMES_STARTED_KEY = 'dinoquiz:roundGamesStartedByModeLevel';
  var ROUND_GAMES_COMPLETED_KEY = 'dinoquiz:roundGamesCompletedByModeLevel';
  var ROUND_GAMES_ABANDONED_KEY = 'dinoquiz:roundGamesAbandonedByModeLevel';
  var ROUND_GENERATION_FAILURE_CODES_KEY = 'dinoquiz:roundGenerationFailureCodes';
  var STATE_DISCARD_CODES_KEY = 'dinoquiz:stateDiscardCodes';
  var MAX_LOGS = 1000;
  var LOG_VERSION = '1.0';

  function generateRequestId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function createLogEntry(eventType, metadata) {
    metadata = metadata || {};

    return {
      version: LOG_VERSION,
      timestamp: new Date().toISOString(),
      eventType: eventType,
      requestId: generateRequestId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      platform: detectPlatform(),
      metadata: metadata,
    };
  }

  function detectPlatform() {
    if (typeof navigator === 'undefined') {
      return 'unknown';
    }

    var ua = navigator.userAgent;

    if (/iPad/.test(ua)) return 'tablet_ios';
    if (/Android/.test(ua) && /Mobile/.test(ua)) return 'mobile_android';
    if (/Android/.test(ua)) return 'tablet_android';
    if (/iPhone|iPod/.test(ua)) return 'mobile_ios';
    if (/Windows/.test(ua)) return 'windows';
    if (/Mac/.test(ua)) return 'macos';
    if (/Linux/.test(ua)) return 'linux';
    if (/Chrome OS/.test(ua)) return 'chromeos';

    return 'unknown';
  }

  function createLocalStorageAdapter() {
    return {
      getItem: function (key) {
        if (typeof localStorage === 'undefined') {
          return null;
        }
        try {
          return localStorage.getItem(key);
        } catch (error) {
          return null;
        }
      },
      setItem: function (key, value) {
        if (typeof localStorage === 'undefined') {
          return;
        }
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('DinoQuiz: failed to write to localStorage', error);
        }
      },
    };
  }

  function createMemoryAdapter() {
    var store = {};
    return {
      getItem: function (key) {
        return store[key] || null;
      },
      setItem: function (key, value) {
        store[key] = value;
      },
    };
  }

  function LogService(storageAdapter) {
    this.storageAdapter = storageAdapter || createLocalStorageAdapter();
    this.logs = this._loadLogs();
    this.selectorOpenCount = this._loadSelectorOpenCount();
    this.modeBlockedLogs = this._loadModeBlockedLogs();
    this.mazeGamesStartedByLevel = this._loadLevelCounts(MAZE_GAMES_STARTED_KEY);
    this.mazeGamesCompletedByLevel = this._loadLevelCounts(MAZE_GAMES_COMPLETED_KEY);
    this.mazeGamesAbandonedByLevel = this._loadLevelCounts(MAZE_GAMES_ABANDONED_KEY);
    this.mazeResolvabilityFailureCount = this._loadMazeResolvabilityFailureCount();
    this.gamesAbandonedByMode = this._loadLevelCounts(GAMES_ABANDONED_BY_MODE_KEY);
    this.roundGamesStartedByModeLevel = this._loadLevelCounts(ROUND_GAMES_STARTED_KEY);
    this.roundGamesCompletedByModeLevel = this._loadLevelCounts(ROUND_GAMES_COMPLETED_KEY);
    this.roundGamesAbandonedByModeLevel = this._loadLevelCounts(ROUND_GAMES_ABANDONED_KEY);
    this.roundGenerationFailureCounts = this._loadLevelCounts(ROUND_GENERATION_FAILURE_CODES_KEY);
    this.stateDiscardCounts = this._loadLevelCounts(STATE_DISCARD_CODES_KEY);
  }

  LogService.prototype._loadLogs = function () {
    try {
      var stored = this.storageAdapter.getItem(LOGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('DinoQuiz: failed to load logs from storage', error);
      return [];
    }
  };

  LogService.prototype._saveLogs = function () {
    try {
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      this.storageAdapter.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('DinoQuiz: failed to save logs to storage', error);
    }
  };

  LogService.prototype.logEvent = function (eventType, metadata) {
    if (!eventType || typeof eventType !== 'string') {
      console.warn('DinoQuiz: logEvent requires a valid eventType');
      return;
    }

    var entry = createLogEntry(eventType, metadata);
    this.logs.push(entry);
    this._saveLogs();
  };

  LogService.prototype._loadSelectorOpenCount = function () {
    try {
      var stored = this.storageAdapter.getItem(SELECTOR_OPEN_COUNT_KEY);
      var count = stored ? JSON.parse(stored) : 0;
      return Number.isInteger(count) && count >= 0 ? count : 0;
    } catch (error) {
      console.warn('DinoQuiz: failed to load selector open count from storage', error);
      return 0;
    }
  };

  LogService.prototype._saveSelectorOpenCount = function () {
    try {
      this.storageAdapter.setItem(SELECTOR_OPEN_COUNT_KEY, JSON.stringify(this.selectorOpenCount));
    } catch (error) {
      console.error('DinoQuiz: failed to save selector open count to storage', error);
    }
  };

  LogService.prototype.logSelectorOpen = function () {
    this.selectorOpenCount += 1;
    this._saveSelectorOpenCount();
    return this.selectorOpenCount;
  };

  LogService.prototype.getSelectorOpenCount = function () {
    return this.selectorOpenCount;
  };

  LogService.prototype._loadModeBlockedLogs = function () {
    try {
      var stored = this.storageAdapter.getItem(MODE_BLOCKED_LOGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('DinoQuiz: failed to load mode-blocked logs from storage', error);
      return [];
    }
  };

  LogService.prototype._saveModeBlockedLogs = function () {
    try {
      if (this.modeBlockedLogs.length > MAX_LOGS) {
        this.modeBlockedLogs = this.modeBlockedLogs.slice(-MAX_LOGS);
      }
      this.storageAdapter.setItem(MODE_BLOCKED_LOGS_STORAGE_KEY, JSON.stringify(this.modeBlockedLogs));
    } catch (error) {
      console.error('DinoQuiz: failed to save mode-blocked logs to storage', error);
    }
  };

  LogService.prototype.logModeBlocked = function (modeId, cause) {
    if (typeof modeId !== 'string' || modeId.length === 0) {
      console.warn('DinoQuiz: logModeBlocked requires a valid modeId');
      return;
    }
    var entry = createLogEntry('mode_blocked', { modeId: modeId, cause: cause || null });
    this.modeBlockedLogs.push(entry);
    this._saveModeBlockedLogs();
  };

  LogService.prototype.getModeBlockedLogs = function () {
    return this.modeBlockedLogs.slice();
  };

  /** Reads a `{ [level]: count }` map from storage, defaulting to `{}` for anything missing/corrupted. */
  LogService.prototype._loadLevelCounts = function (key) {
    try {
      var stored = this.storageAdapter.getItem(key);
      var counts = stored ? JSON.parse(stored) : {};
      return counts && typeof counts === 'object' && !Array.isArray(counts) ? counts : {};
    } catch (error) {
      console.warn('DinoQuiz: failed to load ' + key + ' from storage', error);
      return {};
    }
  };

  LogService.prototype._saveLevelCounts = function (key, counts) {
    try {
      this.storageAdapter.setItem(key, JSON.stringify(counts));
    } catch (error) {
      console.error('DinoQuiz: failed to save ' + key + ' to storage', error);
    }
  };

  /** Increments `counts[level]` by one, persists it under `key`, and returns the new count. */
  LogService.prototype._incrementLevelCount = function (key, counts, level) {
    var levelKey = String(level);
    counts[levelKey] = (counts[levelKey] || 0) + 1;
    this._saveLevelCounts(key, counts);
    return counts[levelKey];
  };

  /** Tallies one more Laberinto game started at `level` (PRD "Diagnóstico ... almacenado únicamente en el dispositivo"). */
  LogService.prototype.logMazeGameStarted = function (level) {
    return this._incrementLevelCount(MAZE_GAMES_STARTED_KEY, this.mazeGamesStartedByLevel, level);
  };

  LogService.prototype.getMazeGamesStartedByLevel = function () {
    return Object.assign({}, this.mazeGamesStartedByLevel);
  };

  /** Tallies one more Laberinto game completed (all ROUNDS_PER_GAME rounds reached their goal) at `level`. */
  LogService.prototype.logMazeGameCompleted = function (level) {
    return this._incrementLevelCount(MAZE_GAMES_COMPLETED_KEY, this.mazeGamesCompletedByLevel, level);
  };

  LogService.prototype.getMazeGamesCompletedByLevel = function () {
    return Object.assign({}, this.mazeGamesCompletedByLevel);
  };

  /** Tallies one more Laberinto game left before it was completed (e.g. navigating back to Inicio mid-game) at `level`. */
  LogService.prototype.logMazeGameAbandoned = function (level) {
    return this._incrementLevelCount(MAZE_GAMES_ABANDONED_KEY, this.mazeGamesAbandonedByLevel, level);
  };

  LogService.prototype.getMazeGamesAbandonedByLevel = function () {
    return Object.assign({}, this.mazeGamesAbandonedByLevel);
  };

  LogService.prototype._loadMazeResolvabilityFailureCount = function () {
    try {
      var stored = this.storageAdapter.getItem(MAZE_RESOLVABILITY_FAILURE_COUNT_KEY);
      var count = stored ? JSON.parse(stored) : 0;
      return Number.isInteger(count) && count >= 0 ? count : 0;
    } catch (error) {
      console.warn('DinoQuiz: failed to load maze resolvability failure count from storage', error);
      return 0;
    }
  };

  LogService.prototype._saveMazeResolvabilityFailureCount = function () {
    try {
      this.storageAdapter.setItem(MAZE_RESOLVABILITY_FAILURE_COUNT_KEY, JSON.stringify(this.mazeResolvabilityFailureCount));
    } catch (error) {
      console.error('DinoQuiz: failed to save maze resolvability failure count to storage', error);
    }
  };

  /** Tallies one more maze/round that could not be generated as solvable (mirrors the raw maze_generation_failed/maze_round_generation_failed events). */
  LogService.prototype.logMazeResolvabilityFailure = function () {
    this.mazeResolvabilityFailureCount += 1;
    this._saveMazeResolvabilityFailureCount();
    return this.mazeResolvabilityFailureCount;
  };

  LogService.prototype.getMazeResolvabilityFailureCount = function () {
    return this.mazeResolvabilityFailureCount;
  };

  /** Tallies one more confirmed "cambiar de juego" (TRIOFSND-239) that discarded an incomplete round for `modeId`. */
  LogService.prototype.logGameAbandonedByMode = function (modeId) {
    return this._incrementLevelCount(GAMES_ABANDONED_BY_MODE_KEY, this.gamesAbandonedByMode, modeId);
  };

  LogService.prototype.getGamesAbandonedByMode = function () {
    return Object.assign({}, this.gamesAbandonedByMode);
  };

  /** Builds the composite "modeId:suffix" key the round-contract diagnostics counters below are aggregated under. */
  LogService.prototype._modeKey = function (modeId, suffix) {
    return modeId + ':' + suffix;
  };

  /** Tallies one more roundContract.js game started for `modeId` at `level` (TRIOFSND-246). */
  LogService.prototype.logRoundGameStarted = function (modeId, level) {
    return this._incrementLevelCount(ROUND_GAMES_STARTED_KEY, this.roundGamesStartedByModeLevel, this._modeKey(modeId, level));
  };

  LogService.prototype.getRoundGamesStartedByModeLevel = function () {
    return Object.assign({}, this.roundGamesStartedByModeLevel);
  };

  /** Tallies one more roundContract.js game completed (reached `game:over`) for `modeId` at `level`. */
  LogService.prototype.logRoundGameCompleted = function (modeId, level) {
    return this._incrementLevelCount(ROUND_GAMES_COMPLETED_KEY, this.roundGamesCompletedByModeLevel, this._modeKey(modeId, level));
  };

  LogService.prototype.getRoundGamesCompletedByModeLevel = function () {
    return Object.assign({}, this.roundGamesCompletedByModeLevel);
  };

  /** Tallies one more roundContract.js game left before `game:over` for `modeId` at `level` (e.g. navigating away mid-round). */
  LogService.prototype.logRoundGameAbandoned = function (modeId, level) {
    return this._incrementLevelCount(ROUND_GAMES_ABANDONED_KEY, this.roundGamesAbandonedByModeLevel, this._modeKey(modeId, level));
  };

  LogService.prototype.getRoundGamesAbandonedByModeLevel = function () {
    return Object.assign({}, this.roundGamesAbandonedByModeLevel);
  };

  /** Tallies one more local round-generation failure for `modeId`, identified only by a stable, machine-readable `code` (never round content). */
  LogService.prototype.logRoundGenerationFailure = function (modeId, code) {
    if (typeof code !== 'string' || code.length === 0) {
      console.warn('DinoQuiz: logRoundGenerationFailure requires a valid code');
      return 0;
    }
    return this._incrementLevelCount(ROUND_GENERATION_FAILURE_CODES_KEY, this.roundGenerationFailureCounts, this._modeKey(modeId, code));
  };

  LogService.prototype.getRoundGenerationFailureCounts = function () {
    return Object.assign({}, this.roundGenerationFailureCounts);
  };

  /** Tallies one more local state-discard for `modeId`, identified only by a stable, machine-readable `code` (never round content). */
  LogService.prototype.logStateDiscarded = function (modeId, code) {
    if (typeof code !== 'string' || code.length === 0) {
      console.warn('DinoQuiz: logStateDiscarded requires a valid code');
      return 0;
    }
    return this._incrementLevelCount(STATE_DISCARD_CODES_KEY, this.stateDiscardCounts, this._modeKey(modeId, code));
  };

  LogService.prototype.getStateDiscardCounts = function () {
    return Object.assign({}, this.stateDiscardCounts);
  };

  LogService.prototype.logAppAccess = function (metadata) {
    this.logEvent('app_access', metadata);
  };

  LogService.prototype.logServiceWorkerInstall = function (metadata) {
    this.logEvent('service_worker_install', metadata);
  };

  LogService.prototype.logServiceWorkerActivate = function (metadata) {
    this.logEvent('service_worker_activate', metadata);
  };

  LogService.prototype.logManifestLoad = function (metadata) {
    this.logEvent('manifest_load', metadata);
  };

  LogService.prototype.logPwaInstallAttempt = function (metadata) {
    this.logEvent('pwa_install_attempt', metadata);
  };

  LogService.prototype.logPwaInstallSuccess = function (metadata) {
    this.logEvent('pwa_install_success', metadata);
  };

  LogService.prototype.logPwaInstallFailure = function (metadata) {
    this.logEvent('pwa_install_failure', metadata);
  };

  LogService.prototype.getLogs = function () {
    return this.logs.slice();
  };

  LogService.prototype.getLogsByType = function (eventType) {
    return this.logs.filter(function (entry) {
      return entry.eventType === eventType;
    });
  };

  LogService.prototype.getLogsByTimeRange = function (startTime, endTime) {
    var start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    var end = typeof endTime === 'string' ? new Date(endTime) : endTime;

    return this.logs.filter(function (entry) {
      var ts = new Date(entry.timestamp);
      return ts >= start && ts <= end;
    });
  };

  LogService.prototype.clearLogs = function () {
    this.logs = [];
    this._saveLogs();
  };

  LogService.prototype.getLogsPayload = function () {
    return {
      version: LOG_VERSION,
      timestamp: new Date().toISOString(),
      logCount: this.logs.length,
      logs: this.logs,
    };
  };

  LogService.prototype.sendLogs = function (endpointUrl, options) {
    var self = this;
    options = options || {};
    var clearOnSuccess = options.clearOnSuccess !== false; // default true
    var timeout = options.timeout || 5000;

    if (!endpointUrl || typeof endpointUrl !== 'string') {
      return Promise.reject(new Error('sendLogs requires a valid endpointUrl'));
    }

    if (typeof fetch === 'undefined') {
      return Promise.reject(new Error('fetch API not available'));
    }

    var payload = this.getLogsPayload();

    return fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        return response.json().catch(function () {
          return { success: true };
        });
      })
      .then(function (data) {
        if (clearOnSuccess) {
          self.clearLogs();
        }
        return data;
      })
      .catch(function (error) {
        console.error('DinoQuiz: failed to send logs to ' + endpointUrl, error);
        throw error;
      });
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      LogService: LogService,
      createLogEntry: createLogEntry,
      generateRequestId: generateRequestId,
      detectPlatform: detectPlatform,
      createLocalStorageAdapter: createLocalStorageAdapter,
      createMemoryAdapter: createMemoryAdapter,
      LOGS_STORAGE_KEY: LOGS_STORAGE_KEY,
      SELECTOR_OPEN_COUNT_KEY: SELECTOR_OPEN_COUNT_KEY,
      MODE_BLOCKED_LOGS_STORAGE_KEY: MODE_BLOCKED_LOGS_STORAGE_KEY,
      MAZE_GAMES_STARTED_KEY: MAZE_GAMES_STARTED_KEY,
      MAZE_GAMES_COMPLETED_KEY: MAZE_GAMES_COMPLETED_KEY,
      MAZE_GAMES_ABANDONED_KEY: MAZE_GAMES_ABANDONED_KEY,
      MAZE_RESOLVABILITY_FAILURE_COUNT_KEY: MAZE_RESOLVABILITY_FAILURE_COUNT_KEY,
      GAMES_ABANDONED_BY_MODE_KEY: GAMES_ABANDONED_BY_MODE_KEY,
      ROUND_GAMES_STARTED_KEY: ROUND_GAMES_STARTED_KEY,
      ROUND_GAMES_COMPLETED_KEY: ROUND_GAMES_COMPLETED_KEY,
      ROUND_GAMES_ABANDONED_KEY: ROUND_GAMES_ABANDONED_KEY,
      ROUND_GENERATION_FAILURE_CODES_KEY: ROUND_GENERATION_FAILURE_CODES_KEY,
      STATE_DISCARD_CODES_KEY: STATE_DISCARD_CODES_KEY,
      MAX_LOGS: MAX_LOGS,
      LOG_VERSION: LOG_VERSION,
    };
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.logging = {
      LogService: LogService,
      createLocalStorageAdapter: createLocalStorageAdapter,
      createMemoryAdapter: createMemoryAdapter,
    };
  }
})();
