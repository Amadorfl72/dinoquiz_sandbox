'use strict';

/**
 * Device compatibility + anonymous crash logging (TRIOFSND-143).
 *
 * Client-side only, no backend (PRD: sin tracking individual, sin SDK
 * publicitario comportamental): captures an aggregated, non-PII device
 * snapshot (OS/version, coarse device class, locale, screen size, user
 * agent -- never an identifier, IP or precise location) plus anonymous
 * crash events (window 'error'/'unhandledrejection'), so compatibility
 * across the PRD's tablet-first support matrix can be triaged from what's
 * stored locally, no server round-trip involved. This is exactly the
 * "fallo técnico (crash)" case the privacy policy already documents
 * (public/i18n/es.json, section "para-que").
 *
 * Crash events deliberately carry only a short message, source file and
 * line/column -- never a full stack trace or the erroring value itself --
 * to stay anonymous per PRD by-design privacy.
 *
 * Browser bridge: DinoQuiz ships without a bundler, so this follows the
 * same dual CommonJS/global pattern as public/scripts/network.js --
 * registers on `window.DinoQuiz.services.deviceCompat` for the
 * `<script>`-loaded PWA and `module.exports` for Node/Jest. The canonical
 * `src/services/deviceCompat.js` re-exports this file. Persistence uses the
 * same namespaced localStorage keys (`dinoquiz:deviceInfo`,
 * `dinoquiz:crashLog`) that src/services/storage's `deviceInfo`/`crashLog`
 * fields model, mirroring MUTE_STORAGE_KEY in public/scripts/main.js, so
 * both paths agree once a bundler wires the real StorageClient in.
 */

(function () {
  var MAX_CRASH_EVENTS = 20;
  var MAX_MESSAGE_LENGTH = 200;
  var DEVICE_INFO_STORAGE_KEY = 'dinoquiz:deviceInfo';
  var CRASH_LOG_STORAGE_KEY = 'dinoquiz:crashLog';

  function truncate(text, maxLength) {
    if (typeof text !== 'string') {
      return '';
    }
    return text.length > maxLength ? text.slice(0, maxLength) : text;
  }

  /**
   * Coarse, non-PII OS name/version parsed from the user agent -- enough for
   * compatibility triage, not a full UA-sniffing library.
   */
  function parseOs(userAgent) {
    userAgent = typeof userAgent === 'string' ? userAgent : '';

    var androidMatch = userAgent.match(/Android\s([\d.]+)/);
    if (androidMatch) {
      return { name: 'Android', version: androidMatch[1] };
    }

    var iosMatch = userAgent.match(/(?:iPhone|iPad|iPod).*?OS\s([\d_]+)/);
    if (iosMatch) {
      return { name: 'iOS', version: iosMatch[1].replace(/_/g, '.') };
    }

    var macMatch = userAgent.match(/Mac OS X\s([\d_]+)/);
    if (macMatch) {
      return { name: 'macOS', version: macMatch[1].replace(/_/g, '.') };
    }

    var windowsMatch = userAgent.match(/Windows NT\s([\d.]+)/);
    if (windowsMatch) {
      return { name: 'Windows', version: windowsMatch[1] };
    }

    if (/Linux/.test(userAgent)) {
      return { name: 'Linux', version: '' };
    }

    return { name: 'unknown', version: '' };
  }

  /**
   * A coarse device-class label ('tablet' | 'mobile' | 'desktop') -- the
   * PRD's tablet-first support matrix cares about this, never a specific
   * model/serial number.
   */
  function classifyDevice(userAgent) {
    userAgent = typeof userAgent === 'string' ? userAgent : '';

    if (/iPad/.test(userAgent) || (/Android/.test(userAgent) && !/Mobile/.test(userAgent))) {
      return 'tablet';
    }
    if (/Mobi|iPhone|iPod/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Aggregated, non-PII device snapshot: OS/version, coarse device class,
   * locale, screen/viewport size and the raw user agent -- enough to triage
   * compatibility, nothing that identifies a specific child or device.
   */
  function collectDeviceInfo(nav, scr, win) {
    nav = nav || (typeof navigator !== 'undefined' ? navigator : undefined);
    scr = scr || (typeof screen !== 'undefined' ? screen : undefined);
    win = win || (typeof window !== 'undefined' ? window : undefined);

    var userAgent = (nav && nav.userAgent) || '';
    var os = parseOs(userAgent);

    return {
      os: os.name,
      osVersion: os.version,
      deviceClass: classifyDevice(userAgent),
      locale: (nav && (nav.language || (nav.languages && nav.languages[0]))) || '',
      userAgent: userAgent,
      screenWidth: (scr && scr.width) || 0,
      screenHeight: (scr && scr.height) || 0,
      pixelRatio: (win && win.devicePixelRatio) || 1,
    };
  }

  function safeReasonMessage(reason) {
    if (reason instanceof Error) {
      return reason.message || reason.name || 'Error';
    }
    if (typeof reason === 'string') {
      return reason;
    }
    try {
      return JSON.stringify(reason);
    } catch (error) {
      return String(reason);
    }
  }

  /**
   * Anonymous crash event from a window 'error' event: message + source
   * location + timestamp only -- never the full stack trace.
   */
  function createErrorCrashEvent(errorEvent, now) {
    errorEvent = errorEvent || {};
    return {
      type: 'error',
      message: truncate(errorEvent.message || 'Unknown error', MAX_MESSAGE_LENGTH),
      source: truncate(String(errorEvent.filename || ''), MAX_MESSAGE_LENGTH),
      line: typeof errorEvent.lineno === 'number' ? errorEvent.lineno : null,
      column: typeof errorEvent.colno === 'number' ? errorEvent.colno : null,
      timestamp: typeof now === 'number' ? now : Date.now(),
    };
  }

  /** Anonymous crash event from an 'unhandledrejection' event. */
  function createRejectionCrashEvent(rejectionEvent, now) {
    rejectionEvent = rejectionEvent || {};
    return {
      type: 'unhandledrejection',
      message: truncate(safeReasonMessage(rejectionEvent.reason), MAX_MESSAGE_LENGTH),
      source: '',
      line: null,
      column: null,
      timestamp: typeof now === 'number' ? now : Date.now(),
    };
  }

  /**
   * Attaches window 'error'/'unhandledrejection' listeners that turn each
   * crash into an anonymous event and forward it to `onCrash`. Never
   * throws and never calls `preventDefault`, so it only observes crashes
   * without changing how the browser/console reports them -- a broken
   * logger must never break the game. Returns a `dispose()` to remove both
   * listeners.
   */
  function installCrashLogger(options) {
    options = options || {};
    var win = options.window || (typeof window !== 'undefined' ? window : undefined);
    var onCrash = typeof options.onCrash === 'function' ? options.onCrash : function () {};

    if (!win || typeof win.addEventListener !== 'function') {
      return function dispose() {};
    }

    function handleError(event) {
      try {
        onCrash(createErrorCrashEvent(event));
      } catch (error) {
        // The crash logger itself must never crash the app.
      }
    }

    function handleRejection(event) {
      try {
        onCrash(createRejectionCrashEvent(event));
      } catch (error) {
        // The crash logger itself must never crash the app.
      }
    }

    win.addEventListener('error', handleError);
    win.addEventListener('unhandledrejection', handleRejection);

    return function dispose() {
      win.removeEventListener('error', handleError);
      win.removeEventListener('unhandledrejection', handleRejection);
    };
  }

  /**
   * Persists the device snapshot under the namespaced key
   * src/services/storage's `deviceInfo` field reads (mirrors
   * MUTE_STORAGE_KEY's rationale in public/scripts/main.js). Best-effort
   * only: a failed write (quota exceeded, Safari private mode) must never
   * block the game.
   */
  function persistDeviceInfo(deviceInfo, storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return;
    }
    try {
      storageObj.setItem(DEVICE_INFO_STORAGE_KEY, JSON.stringify(deviceInfo));
    } catch (error) {
      // Best-effort only, see doc comment above.
    }
  }

  /**
   * Appends one crash event to the capped, namespaced local crash log (same
   * rationale as persistDeviceInfo). Keeps only the MAX_CRASH_EVENTS most
   * recent entries so a long play session can't grow it unbounded.
   */
  function persistCrashEvent(crashEvent, storageObj) {
    storageObj = storageObj || (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!storageObj) {
      return;
    }
    try {
      var raw = storageObj.getItem(CRASH_LOG_STORAGE_KEY);
      var log = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(log)) {
        log = [];
      }
      log.push(crashEvent);
      if (log.length > MAX_CRASH_EVENTS) {
        log = log.slice(log.length - MAX_CRASH_EVENTS);
      }
      storageObj.setItem(CRASH_LOG_STORAGE_KEY, JSON.stringify(log));
    } catch (error) {
      // Best-effort only, see doc comment above.
    }
  }

  var api = {
    MAX_CRASH_EVENTS: MAX_CRASH_EVENTS,
    DEVICE_INFO_STORAGE_KEY: DEVICE_INFO_STORAGE_KEY,
    CRASH_LOG_STORAGE_KEY: CRASH_LOG_STORAGE_KEY,
    parseOs: parseOs,
    classifyDevice: classifyDevice,
    collectDeviceInfo: collectDeviceInfo,
    createErrorCrashEvent: createErrorCrashEvent,
    createRejectionCrashEvent: createRejectionCrashEvent,
    installCrashLogger: installCrashLogger,
    persistDeviceInfo: persistDeviceInfo,
    persistCrashEvent: persistCrashEvent,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.deviceCompat = api;
  }
})();
