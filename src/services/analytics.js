'use strict';

/**
 * Local, on-device analytics recorder for the generic mode dispatcher
 * (public/scripts/main.js's `handleModeSelected`/`startMode`, TRIOFSND-322).
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
 *
 * Same require-or-`window.DinoQuiz` resolution shape as every other
 * optional service main.js resolves (e.g. resolveGameSessionStorage's own
 * doc comment): this module has no `public/scripts/` browser port yet, so
 * it resolves under Node/Jest today and simply records nothing yet in the
 * real, bundler-less browser until a future ticket wires it in there too --
 * the same documented, fail-open gap resolveGameSessionStorage already has.
 */

const STORAGE_KEY = 'dinoquiz:modeAnalyticsEventCounts';
const DETAILS_STORAGE_KEY = 'dinoquiz:modeAnalyticsEventDetails';

let memoryCounts = {};
let memoryDetails = {};

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
    return { ...memoryCounts };
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return { ...memoryCounts };
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
  const storage = resolveStorage(storageAdapter);
  const counts = readCounts(storage);
  const next = (counts[eventName] || 0) + 1;
  counts[eventName] = next;
  writeCounts(storage, counts);
  return next;
}

/** Current aggregated count for `eventName`, 0 if it was never recorded. */
function getEventCount(eventName, storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  return readCounts(storage)[eventName] || 0;
}

/** Full aggregated `{eventName: count}` snapshot, for the diagnostics/export screens. */
function getEventCounts(storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  return readCounts(storage);
}

function readDetails(storage) {
  if (!storage) {
    return { ...memoryDetails };
  }
  try {
    const raw = storage.getItem(DETAILS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return { ...memoryDetails };
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
  const storage = resolveStorage(storageAdapter);
  const details = readDetails(storage);
  details[eventName] = detail;
  writeDetails(storage, details);
}

/** The most recent detail object recorded for `eventName`, or null if none was ever recorded. */
function getEventDetail(eventName, storageAdapter) {
  const storage = resolveStorage(storageAdapter);
  const details = readDetails(storage);
  return Object.prototype.hasOwnProperty.call(details, eventName) ? details[eventName] : null;
}

module.exports = {
  STORAGE_KEY,
  DETAILS_STORAGE_KEY,
  recordEvent,
  getEventCount,
  getEventCounts,
  recordEventDetail,
  getEventDetail,
};
