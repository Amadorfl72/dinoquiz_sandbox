'use strict';

/**
 * Local, on-device analytics recorder for the generic mode dispatcher
 * (public/scripts/main.js's `handleModeSelected`/`startMode`, TRIOFSND-322).
 *
 * The implementation lives here in public/scripts/ (not only in
 * src/services/) because main.js's `resolveAnalytics` has to reach it live in
 * the real, bundler-less browser -- it is loaded there as a `<script>` (see
 * public/index.html) which registers it on `window.DinoQuiz.services.analytics`,
 * the same require-or-`window.DinoQuiz` bridge every other browser-facing
 * service uses (modeStorage.js, diagnosticsService.js, modeProgressStorage.js).
 * The canonical `src/services/analytics.js` module re-exports this file so
 * Node/Jest keep a single source of truth -- mirrors how src/services/
 * modeStorage.js re-exports public/scripts/modeStorage.js. Before this bridge
 * existed the recorder only resolved under `require` (Jest), so the four
 * dispatcher events were recorded in tests but silently dropped on the real
 * device.
 *
 * Plain localStorage under a single `dinoquiz:` namespaced key, mirroring
 * nicknameService.js/hallOfFameService.js's own direct-localStorage pattern
 * rather than src/services/storage's IndexedDB-with-fallback client -- this
 * is a handful of aggregated counters, not a whole game session. Every
 * write degrades to an in-memory fallback when localStorage is unavailable
 * or throws (private browsing, quota exceeded), so counts keep accumulating
 * for the rest of this page load instead of being silently lost.
 *
 * Four event names are recorded here (privacy-audited, non-PII, see
 * src/services/analytics/approvedEvents.js's APPROVED_ANALYTICS_EVENTS):
 * `mode_selected` (a mode card tap reaches the dispatcher), `match_started`
 * (a mode's own engine actually begins a match), `mode_blocked` (a known mode
 * with no valid destination -- missing renderer/dependencies, or a blocked
 * selector card tapped anyway) and `mode_dispatch_mismatch` (the registry
 * resolved a destination whose own mode id disagrees with the one selected).
 * No round content, score, answer or player identifier is ever recorded --
 * only that one of these four things happened, how many times, and (via
 * `recordEventDetail`) the non-PII `mode_id`/`cause`/`resolved_mode_id` of
 * the most recent occurrence.
 *
 * `recordEventDetail` is deliberately a second call, never folded into
 * `recordEvent` itself: `recordEvent(eventName)` keeps its single-argument
 * shape because `tests/privacy-audit/analytics-events.test.js` statically
 * greps for exactly that shape to confirm every approved event is actually
 * emitted somewhere in the codebase. `recordEventDetail` only ever stores
 * the latest payload per event name (not a growing history) under its own
 * `dinoquiz:`-namespaced key, so a burst of taps never grows storage
 * unbounded.
 */

(function () {
  var STORAGE_KEY = 'dinoquiz:modeAnalyticsEventCounts';
  var DETAILS_STORAGE_KEY = 'dinoquiz:modeAnalyticsEventDetails';

  var memoryCounts = {};
  var memoryDetails = {};

  function resolveStorage(storageAdapter) {
    if (storageAdapter) {
      return storageAdapter;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function readCounts(storage) {
    if (!storage) {
      return Object.assign({}, memoryCounts);
    }
    try {
      var raw = storage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return Object.assign({}, memoryCounts);
    }
  }

  function writeCounts(storage, counts) {
    memoryCounts = counts;
    if (!storage) {
      return;
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(counts));
    } catch (error) {
      // Quota exceeded or unavailable: `memoryCounts` above already keeps the
      // count correct for the rest of this session, it just won't persist.
    }
  }

  /**
   * Increments the local, aggregated counter for `eventName` and returns its
   * new count. Never throws -- a storage failure just means this event's
   * count stops persisting across reloads, it never blocks dispatch.
   */
  function recordEvent(eventName, storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    var counts = readCounts(storage);
    var next = (counts[eventName] || 0) + 1;
    counts[eventName] = next;
    writeCounts(storage, counts);
    return next;
  }

  /** Current aggregated count for `eventName`, 0 if it was never recorded. */
  function getEventCount(eventName, storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    return readCounts(storage)[eventName] || 0;
  }

  /** Full aggregated `{eventName: count}` snapshot, for the diagnostics/export screens. */
  function getEventCounts(storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    return readCounts(storage);
  }

  function readDetails(storage) {
    if (!storage) {
      return Object.assign({}, memoryDetails);
    }
    try {
      var raw = storage.getItem(DETAILS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return Object.assign({}, memoryDetails);
    }
  }

  function writeDetails(storage, details) {
    memoryDetails = details;
    if (!storage) {
      return;
    }
    try {
      storage.setItem(DETAILS_STORAGE_KEY, JSON.stringify(details));
    } catch (error) {
      // Quota exceeded or unavailable: `memoryDetails` above already keeps the
      // latest detail correct for the rest of this session, it just won't
      // persist -- mirrors `writeCounts`'s own degrade-to-memory shape.
    }
  }

  /**
   * Stores `detail` (a plain, non-PII object -- e.g. `{ mode_id, cause }` or
   * `{ mode_id, resolved_mode_id }`) as the most recent payload recorded for
   * `eventName`, alongside (never instead of) the aggregated count
   * `recordEvent` already tracks. A falsy/non-object `detail` is a no-op.
   * Never throws.
   */
  function recordEventDetail(eventName, detail, storageAdapter) {
    if (!detail || typeof detail !== 'object') {
      return;
    }
    var storage = resolveStorage(storageAdapter);
    var details = readDetails(storage);
    details[eventName] = detail;
    writeDetails(storage, details);
  }

  /** The most recent detail object recorded for `eventName`, or null if none was ever recorded. */
  function getEventDetail(eventName, storageAdapter) {
    var storage = resolveStorage(storageAdapter);
    var details = readDetails(storage);
    return Object.prototype.hasOwnProperty.call(details, eventName) ? details[eventName] : null;
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    DETAILS_STORAGE_KEY: DETAILS_STORAGE_KEY,
    recordEvent: recordEvent,
    getEventCount: getEventCount,
    getEventCounts: getEventCounts,
    recordEventDetail: recordEventDetail,
    getEventDetail: getEventDetail,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.analytics = api;
  }
})();
