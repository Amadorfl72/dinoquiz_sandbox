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
 * (a mode's own engine actually begins a match), `mode_blocked` (a blocked
 * card was tapped anyway) and `mode_dispatch_mismatch` (the dispatcher's
 * mode->renderer registry has no entry for the selected id, so the
 * accessible fallback warning screen shows instead of silently starting
 * Quiz). No round content, score, answer or player identifier is ever
 * recorded -- only that one of these four things happened, and how many
 * times.
 *
 * Same require-or-`window.DinoQuiz` resolution shape as every other
 * optional service main.js resolves (e.g. resolveGameSessionStorage's own
 * doc comment): this module has no `public/scripts/` browser port yet, so
 * it resolves under Node/Jest today and simply records nothing yet in the
 * real, bundler-less browser until a future ticket wires it in there too --
 * the same documented, fail-open gap resolveGameSessionStorage already has.
 */

const STORAGE_KEY = 'dinoquiz:modeAnalyticsEventCounts';

let memoryCounts = {};

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

module.exports = {
  STORAGE_KEY,
  recordEvent,
  getEventCount,
  getEventCounts,
};
