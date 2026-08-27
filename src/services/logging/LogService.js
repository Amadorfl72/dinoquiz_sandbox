'use strict';

/**
 * Structured logging service for DinoQuiz.
 *
 * Collects and stores structured logs for user access and PWA installation
 * attempts in a format ready for observability/analytics. Logs are stored
 * locally (localStorage/IndexedDB) and can be retrieved for transmission to
 * a logging backend when network connectivity allows.
 *
 * Event types:
 * - 'app_access': app initialization/load
 * - 'service_worker_install': service worker installed
 * - 'service_worker_activate': service worker activated
 * - 'manifest_load': manifest.json loaded
 * - 'pwa_install_attempt': user initiated PWA installation
 * - 'pwa_install_success': PWA installation completed
 * - 'pwa_install_failure': PWA installation failed
 *
 * Diagnostics counters (TRIOFSND-230): unlike the per-occurrence log entries
 * above, `logSelectorOpen()`/`getSelectorOpenCount()` track a single
 * aggregated, local-only tally (how many times the mode selector was
 * opened) so repeated opens across sessions stay O(1) in storage instead of
 * growing the log array. Local-only per the PRD's privacy constraint --
 * never included in `sendLogs`' payload.
 *
 * `logModeBlocked(modeId, cause)`/`getModeBlockedLogs()` record mode
 * selector attempts blocked by an unmet availability requirement (see
 * src/game/modesCatalog.js's AVAILABILITY_CAUSES) -- each entry carries
 * { modeId, cause }, both machine-readable ids, never free text. These
 * entries are stored under their own local-only storage key, entirely
 * separate from the transmittable `this.logs` array, so they can never be
 * included in `getLogsPayload()`/`sendLogs()`'s payload.
 *
 * Endpoint transmission:
 * - `sendLogs(endpointUrl, options)` sends accumulated logs to a backend
 * - Logs are transmitted as POST JSON to the endpoint URL
 * - Default behavior clears logs after successful transmission
 * - Handles network errors gracefully and rejects on failure
 */

const LOGS_STORAGE_KEY = 'dinoquiz:logs';
const SELECTOR_OPEN_COUNT_KEY = 'dinoquiz:selectorOpenCount';
const MODE_BLOCKED_LOGS_STORAGE_KEY = 'dinoquiz:modeBlockedLogs';
const MAZE_GAMES_STARTED_KEY = 'dinoquiz:mazeGamesStartedByLevel';
const MAZE_GAMES_COMPLETED_KEY = 'dinoquiz:mazeGamesCompletedByLevel';
const MAZE_GAMES_ABANDONED_KEY = 'dinoquiz:mazeGamesAbandonedByLevel';
const MAZE_RESOLVABILITY_FAILURE_COUNT_KEY = 'dinoquiz:mazeResolvabilityFailureCount';
const GAMES_ABANDONED_BY_MODE_KEY = 'dinoquiz:gamesAbandonedByMode';
const MAX_LOGS = 1000; // Prevent unbounded growth
const LOG_VERSION = '1.0';

/**
 * Generates a unique request ID for tracing related events
 * @returns {string} UUID-like identifier
 */
function generateRequestId() {
  return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Creates a structured log entry
 * @param {string} eventType - Type of event (e.g., 'app_access', 'pwa_install_success')
 * @param {object} metadata - Additional event metadata (no PII)
 * @returns {object} Structured log entry
 */
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

/**
 * Detects the user's platform
 * @returns {string} Platform identifier
 */
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

/**
 * LogService manages structured event logging
 */
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
    // Keep only the most recent MAX_LOGS entries to prevent unbounded storage growth
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }
    this.storageAdapter.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs));
  } catch (error) {
    console.error('DinoQuiz: failed to save logs to storage', error);
  }
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
    // Keep only the most recent MAX_LOGS entries to prevent unbounded storage growth
    if (this.modeBlockedLogs.length > MAX_LOGS) {
      this.modeBlockedLogs = this.modeBlockedLogs.slice(-MAX_LOGS);
    }
    this.storageAdapter.setItem(MODE_BLOCKED_LOGS_STORAGE_KEY, JSON.stringify(this.modeBlockedLogs));
  } catch (error) {
    console.error('DinoQuiz: failed to save mode-blocked logs to storage', error);
  }
};

/**
 * Records a structured event
 * @param {string} eventType - Type of event
 * @param {object} metadata - Additional metadata (no PII)
 */
LogService.prototype.logEvent = function (eventType, metadata) {
  if (!eventType || typeof eventType !== 'string') {
    console.warn('DinoQuiz: logEvent requires a valid eventType');
    return;
  }

  var entry = createLogEntry(eventType, metadata);
  this.logs.push(entry);
  this._saveLogs();
};

/**
 * Records app access event
 * @param {object} metadata - Additional metadata (e.g., referrer, locale)
 */
LogService.prototype.logAppAccess = function (metadata) {
  this.logEvent('app_access', metadata);
};

/**
 * Records service worker installation
 * @param {object} metadata - Additional metadata
 */
LogService.prototype.logServiceWorkerInstall = function (metadata) {
  this.logEvent('service_worker_install', metadata);
};

/**
 * Records service worker activation
 * @param {object} metadata - Additional metadata
 */
LogService.prototype.logServiceWorkerActivate = function (metadata) {
  this.logEvent('service_worker_activate', metadata);
};

/**
 * Records manifest load event
 * @param {object} metadata - Additional metadata
 */
LogService.prototype.logManifestLoad = function (metadata) {
  this.logEvent('manifest_load', metadata);
};

/**
 * Records PWA installation attempt
 * @param {object} metadata - Additional metadata
 */
LogService.prototype.logPwaInstallAttempt = function (metadata) {
  this.logEvent('pwa_install_attempt', metadata);
};

/**
 * Records successful PWA installation
 * @param {object} metadata - Additional metadata (e.g., displayMode, installSource)
 */
LogService.prototype.logPwaInstallSuccess = function (metadata) {
  this.logEvent('pwa_install_success', metadata);
};

/**
 * Records failed PWA installation
 * @param {object} metadata - Additional metadata (e.g., error reason)
 */
LogService.prototype.logPwaInstallFailure = function (metadata) {
  this.logEvent('pwa_install_failure', metadata);
};

/**
 * Records that the mode selector was opened. An aggregated, non-PII local
 * counter (TRIOFSND-230, PRD logging_observability) -- increments a single
 * persisted number rather than pushing a new log entry, so opening the
 * selector repeatedly never grows the log array.
 * @returns {number} The updated count
 */
LogService.prototype.logSelectorOpen = function () {
  this.selectorOpenCount += 1;
  this._saveSelectorOpenCount();
  return this.selectorOpenCount;
};

/**
 * Retrieves the aggregated selector-open count
 * @returns {number} Number of times the mode selector was opened
 */
LogService.prototype.getSelectorOpenCount = function () {
  return this.selectorOpenCount;
};

/**
 * Records a blocked mode-selection attempt. Stored under its own local-only
 * key (dinoquiz:modeBlockedLogs), entirely separate from `this.logs` --
 * never pushed into the transmittable log array, so it can never be sent by
 * `sendLogs()` (PRD privacy constraint: local-only diagnostics).
 * @param {string} modeId - The mode's id (see src/game/modesCatalog.js MODE_IDS)
 * @param {string} cause - Machine-readable block cause (see modesCatalog.js AVAILABILITY_CAUSES)
 */
LogService.prototype.logModeBlocked = function (modeId, cause) {
  if (typeof modeId !== 'string' || modeId.length === 0) {
    console.warn('DinoQuiz: logModeBlocked requires a valid modeId');
    return;
  }
  var entry = createLogEntry('mode_blocked', { modeId: modeId, cause: cause || null });
  this.modeBlockedLogs.push(entry);
  this._saveModeBlockedLogs();
};

/**
 * Retrieves all locally-recorded mode-blocked entries. Local-only diagnostic
 * data -- never included in `getLogsPayload()`/`sendLogs()`.
 * @returns {array} Defensive copy of the mode-blocked log entries
 */
LogService.prototype.getModeBlockedLogs = function () {
  return this.modeBlockedLogs.slice();
};

/**
 * Reads a `{ [level]: count }` map from storage, defaulting to `{}` for anything missing/corrupted.
 * @param {string} key - Storage key
 * @returns {object} Per-level counts
 */
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

/**
 * Increments `counts[level]` by one, persists it under `key`, and returns the new count.
 * @param {string} key - Storage key
 * @param {object} counts - Current per-level counts (mutated in place)
 * @param {number} level - The Laberinto difficulty level
 * @returns {number} The updated count for `level`
 */
LogService.prototype._incrementLevelCount = function (key, counts, level) {
  var levelKey = String(level);
  counts[levelKey] = (counts[levelKey] || 0) + 1;
  this._saveLevelCounts(key, counts);
  return counts[levelKey];
};

/**
 * Tallies one more Laberinto game started at `level` (TRIOFSND-259, PRD
 * "Diagnóstico y métricas agregadas almacenadas únicamente en el dispositivo").
 * @param {number} level - The Laberinto difficulty level
 * @returns {number} The updated count for `level`
 */
LogService.prototype.logMazeGameStarted = function (level) {
  return this._incrementLevelCount(MAZE_GAMES_STARTED_KEY, this.mazeGamesStartedByLevel, level);
};

/**
 * @returns {object} Defensive copy of the per-level Laberinto games-started counts
 */
LogService.prototype.getMazeGamesStartedByLevel = function () {
  return Object.assign({}, this.mazeGamesStartedByLevel);
};

/**
 * Tallies one more Laberinto game completed (all rounds reached their goal) at `level`.
 * @param {number} level - The Laberinto difficulty level
 * @returns {number} The updated count for `level`
 */
LogService.prototype.logMazeGameCompleted = function (level) {
  return this._incrementLevelCount(MAZE_GAMES_COMPLETED_KEY, this.mazeGamesCompletedByLevel, level);
};

/**
 * @returns {object} Defensive copy of the per-level Laberinto games-completed counts
 */
LogService.prototype.getMazeGamesCompletedByLevel = function () {
  return Object.assign({}, this.mazeGamesCompletedByLevel);
};

/**
 * Tallies one more Laberinto game left before it was completed (e.g.
 * navigating back to Inicio mid-game) at `level`.
 * @param {number} level - The Laberinto difficulty level
 * @returns {number} The updated count for `level`
 */
LogService.prototype.logMazeGameAbandoned = function (level) {
  return this._incrementLevelCount(MAZE_GAMES_ABANDONED_KEY, this.mazeGamesAbandonedByLevel, level);
};

/**
 * @returns {object} Defensive copy of the per-level Laberinto games-abandoned counts
 */
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

/**
 * Tallies one more maze/round that could not be generated as solvable
 * (mirrors the raw maze_generation_failed/maze_round_generation_failed
 * events already logged via logEvent).
 * @returns {number} The updated count
 */
LogService.prototype.logMazeResolvabilityFailure = function () {
  this.mazeResolvabilityFailureCount += 1;
  this._saveMazeResolvabilityFailureCount();
  return this.mazeResolvabilityFailureCount;
};

/**
 * @returns {number} How many maze/round generations failed to produce a solvable maze
 */
LogService.prototype.getMazeResolvabilityFailureCount = function () {
  return this.mazeResolvabilityFailureCount;
};

/**
 * Tallies one more confirmed "cambiar de juego" (TRIOFSND-239) that discarded
 * an incomplete round for `modeId`.
 * @param {string} modeId - The mode id whose incomplete round was discarded
 * @returns {number} The updated count for `modeId`
 */
LogService.prototype.logGameAbandonedByMode = function (modeId) {
  return this._incrementLevelCount(GAMES_ABANDONED_BY_MODE_KEY, this.gamesAbandonedByMode, modeId);
};

/**
 * @returns {object} Defensive copy of the per-mode games-abandoned-by-mode-change counts
 */
LogService.prototype.getGamesAbandonedByMode = function () {
  return Object.assign({}, this.gamesAbandonedByMode);
};

/**
 * Retrieves all logged events
 * @returns {array} Array of log entries
 */
LogService.prototype.getLogs = function () {
  return this.logs.slice();
};

/**
 * Retrieves logs of a specific type
 * @param {string} eventType - Type of event to filter by
 * @returns {array} Filtered log entries
 */
LogService.prototype.getLogsByType = function (eventType) {
  return this.logs.filter(function (entry) {
    return entry.eventType === eventType;
  });
};

/**
 * Retrieves logs within a time range
 * @param {Date|string} startTime - Start time (ISO string or Date)
 * @param {Date|string} endTime - End time (ISO string or Date)
 * @returns {array} Filtered log entries
 */
LogService.prototype.getLogsByTimeRange = function (startTime, endTime) {
  var start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  var end = typeof endTime === 'string' ? new Date(endTime) : endTime;

  return this.logs.filter(function (entry) {
    var ts = new Date(entry.timestamp);
    return ts >= start && ts <= end;
  });
};

/**
 * Clears all logs
 */
LogService.prototype.clearLogs = function () {
  this.logs = [];
  this._saveLogs();
};

/**
 * Returns logs in a format suitable for transmission to a backend
 * @returns {object} Payload ready for API submission
 */
LogService.prototype.getLogsPayload = function () {
  return {
    version: LOG_VERSION,
    timestamp: new Date().toISOString(),
    logCount: this.logs.length,
    logs: this.logs,
  };
};

/**
 * Sends accumulated logs to a backend endpoint
 * @param {string} endpointUrl - The endpoint URL to POST logs to
 * @param {object} options - Optional configuration (clearOnSuccess, timeout, etc.)
 * @returns {Promise} Resolves with the endpoint response on success, rejects on failure
 */
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
      if (typeof response.json !== 'function') {
        return { success: true };
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

/**
 * Creates a simple localStorage-based adapter
 * @returns {object} Storage adapter with getItem/setItem interface
 */
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

/**
 * Creates an in-memory storage adapter (for testing)
 * @returns {object} Storage adapter with getItem/setItem interface
 */
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
