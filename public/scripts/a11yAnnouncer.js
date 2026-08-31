'use strict';

/**
 * Accessibility announcer (TRIOFSND-311, PRD "Todos los modos deben ser ...
 * anunciables por lector de pantalla").
 *
 * Before this service, questionScreen.js/resultsScreen.js each hand-rolled
 * SEVERAL independent `aria-live="polite"` nodes that could all mutate in the
 * same synchronous tick (questionScreen.js's `feedback`, `announcementEl`,
 * `rewardedAdStatus` and `extraFunFact`) -- a screen reader has no ordering
 * guarantee across distinct live regions, so a child could hear the wrong
 * announcement, hear two overlap, or hear a later one clip an earlier one
 * still being read. `createA11yAnnouncer` centralizes this into ONE reusable
 * `role="status"`/`aria-live="polite"` region plus a FIFO queue: every
 * `announce(message)` call is appended to the queue, and the queue drains one
 * message at a time -- the next message is only written to the region after
 * a reading-time estimate for the current one has elapsed, so consecutive
 * announcements (round change, acierto/error + puntuación, fin de partida)
 * are always heard in order and never overlap.
 *
 * `getRegion()` lazily creates the `<p>` element the caller mounts wherever
 * it renders its screen; it is created once per announcer instance and
 * returned as-is on every subsequent call, so re-appending it (e.g. into a
 * freshly rebuilt screen root) moves the SAME node instead of creating a
 * second, competing one.
 *
 * The reading-time estimate (`minDelayMs` + `msPerCharacter`, both
 * overridable via `options`) is a heuristic -- there is no browser API that
 * reports when a screen reader has finished speaking -- but it is enough to
 * stop a fast-following announcement from stepping on the previous one.
 * Timing is tracked as a `busyUntil` timestamp rather than a proactive
 * "become idle" timer, so a lone `announce()` call with nothing queued
 * behind it schedules no timer at all -- a caller (e.g.
 * questionScreen.js's <300ms feedback budget, AC-5) never picks up a stray
 * pending timer it didn't ask for. A timer is only scheduled while a SECOND
 * message is genuinely waiting for the first one's reading window to end.
 * `options.setTimeout`/`options.clearTimeout`/`options.now`/
 * `options.documentObj` allow tests to inject fakes instead of depending on
 * real timers/DOM globals.
 *
 * Browser bridge: no bundler, so this follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as soundService.js -- registers on
 * `window.DinoQuiz.services.createA11yAnnouncer`; the canonical
 * `src/services/a11yAnnouncer.js` re-exports it for Node/Jest.
 */

(function () {
  var DEFAULT_MIN_DELAY_MS = 1200;
  var DEFAULT_MS_PER_CHARACTER = 50;

  function createA11yAnnouncer(options) {
    options = options || {};
    var docObj = options.documentObj || (typeof document !== 'undefined' ? document : null);
    var setTimeoutFn = options.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    var clearTimeoutFn = options.clearTimeout || (typeof clearTimeout === 'function' ? clearTimeout : null);
    var nowFn = options.now || function () {
      return Date.now();
    };
    var minDelayMs = typeof options.minDelayMs === 'number' ? options.minDelayMs : DEFAULT_MIN_DELAY_MS;
    var msPerCharacter = typeof options.msPerCharacter === 'number' ? options.msPerCharacter : DEFAULT_MS_PER_CHARACTER;

    var region = null;
    var queue = [];
    var busyUntil = 0;
    var pendingTimeoutId = null;

    /** Creates the single reusable live region; never called more than once per instance. */
    function createRegion() {
      if (!docObj || typeof docObj.createElement !== 'function') {
        return null;
      }
      var el = docObj.createElement('p');
      el.classList.add('a11y-announcer', 'sr-only');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      return el;
    }

    function getRegion() {
      if (!region) {
        region = createRegion();
      }
      return region;
    }

    /** A longer message keeps the queue "busy" longer, so a quick follow-up never cuts it off. */
    function estimateReadingDelay(message) {
      var length = typeof message === 'string' ? message.length : 0;
      return Math.max(minDelayMs, length * msPerCharacter);
    }

    /** Writes the next queued message the moment `busyUntil` allows it, scheduling a wake-up timer only if one doesn't already exist. */
    function drainQueue() {
      if (queue.length === 0) {
        return;
      }
      var remaining = busyUntil - nowFn();
      if (remaining > 0) {
        if (pendingTimeoutId === null && setTimeoutFn) {
          pendingTimeoutId = setTimeoutFn(function () {
            pendingTimeoutId = null;
            drainQueue();
          }, remaining);
        }
        return;
      }

      var message = queue.shift();
      var el = getRegion();
      if (el) {
        el.textContent = message;
      }
      busyUntil = nowFn() + estimateReadingDelay(message);

      // Only a message with something queued BEHIND it needs a wake-up timer
      // -- a lone announce() with an empty queue afterwards schedules none,
      // so callers never see a stray pending timer they didn't ask for.
      if (queue.length > 0 && setTimeoutFn) {
        pendingTimeoutId = setTimeoutFn(function () {
          pendingTimeoutId = null;
          drainQueue();
        }, busyUntil - nowFn());
      }
    }

    /** Enqueues `message`; writes it to the region immediately if idle, otherwise once its turn comes. */
    function announce(message) {
      if (typeof message !== 'string' || message.trim() === '') {
        return;
      }
      queue.push(message);
      drainQueue();
    }

    /** Drops any queued/in-flight announcements and blanks the region -- used when a screen unmounts mid-announcement. */
    function clear() {
      queue.length = 0;
      if (pendingTimeoutId !== null && clearTimeoutFn) {
        clearTimeoutFn(pendingTimeoutId);
      }
      pendingTimeoutId = null;
      busyUntil = 0;
      if (region) {
        region.textContent = '';
      }
    }

    return {
      announce: announce,
      clear: clear,
      getRegion: getRegion,
    };
  }

  var api = {
    createA11yAnnouncer: createA11yAnnouncer,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.createA11yAnnouncer = createA11yAnnouncer;
  }
})();
