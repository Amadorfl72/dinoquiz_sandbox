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
 * Endpoint transmission:
 * - `sendLogs(endpointUrl, options)` sends accumulated logs to a backend
 * - Logs are transmitted as POST JSON to the endpoint URL
 * - Default behavior clears logs after successful transmission
 * - Handles network errors gracefully and rejects on failure
 */

const LOGS_STORAGE_KEY = 'dinoquiz:logs';
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
