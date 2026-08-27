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
 * Browser bridge: Without a bundler, this follows the dual CommonJS/global
 * pattern as public/scripts/audio.js — registers on window.DinoQuiz for
 * the browser and module.exports for Node/Jest. The canonical
 * src/services/logging/index.js re-exports this file.
 */

(function () {
  var LOGS_STORAGE_KEY = 'dinoquiz:logs';
  var SELECTOR_OPEN_COUNT_KEY = 'dinoquiz:selectorOpenCount';
  var MODE_BLOCKED_LOGS_STORAGE_KEY = 'dinoquiz:modeBlockedLogs';
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
