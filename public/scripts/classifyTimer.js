'use strict';

/**
 * Orientative/bonus round timer for Clasifica (TRIOFSND-280): tracks how
 * long a round has been running so `classifyGame.js`/its screen can grant a
 * speed bonus, WITHOUT ever turning a slow answer into an error -- expiry
 * only clears `bonusEligible`, it never rejects or fails the round (that
 * stays classifyGame.js's `evaluateRound`, which accepts an answer
 * regardless of what this timer reports).
 *
 * Pause-by-visibility: the moment the tab loses visibility the timer pauses
 * itself (`document`'s `visibilitychange`, subscribed automatically unless
 * `options.autoListen` is `false`) and the hidden interval is never counted
 * -- `resume()` continues from exactly the elapsed time it had before
 * pausing. This mirrors `visibilityPauseService.js`'s own pause/resume-
 * without-penalty guarantee, but stays self-contained (no roundContract
 * session, no registry of timers/audio) since a Clasifica round only ever
 * needs a single bonus clock. `pause()`/`resume()` are also exposed
 * directly so a caller can drive them without going through a real
 * `visibilitychange` event (e.g. tests, or a screen that wants to pause on
 * its own trigger).
 *
 * No fs/data dependency: unlike classifyGame.js (which needs the real,
 * fs-backed creature ficha), this module has no dependency that is unusable
 * in a real, unbundled browser. It therefore follows the same dual
 * CommonJS/global pattern as public/scripts/gameFlow.js/scoring.js directly
 * -- there is no second, browser-specific implementation to keep in sync:
 * it registers on `window.DinoQuiz.game.classifyTimer` (nested, so it never
 * clobbers gameFlow.js's own flat `window.DinoQuiz.game` properties, same
 * precedent as `window.DinoQuiz.game.maze`/`window.DinoQuiz.game.classify`)
 * for the `<script>`-loaded PWA and `module.exports` for Node/Jest. The
 * canonical `src/game/classifyTimer.js` re-exports this file so tests and
 * other modules keep a single source of truth.
 *
 * No DOM writes: this module never creates or writes a DOM element -- it
 * only ever reads `document`'s visibility and exposes `getState()`
 * (`status` + `bonusEligible` + timing) for whatever screen renders it,
 * following the "sin tocar el DOM" boundary the PRD draws for game logic vs.
 * screens.
 */

(function () {
  var STATUS = Object.freeze({
    ACTIVE: 'active',
    PAUSED: 'paused',
    EXPIRED: 'expired',
  });

  // How long the speed bonus stays available for, in ms, when a caller does
  // not pass its own `options.durationMs`. Orientative only: nothing stops
  // working once it elapses, the round simply stops being eligible for bonus.
  var DEFAULT_BONUS_WINDOW_MS = 10000;

  function isDocumentHidden(docObj) {
    if (!docObj) {
      return false;
    }
    if (typeof docObj.hidden === 'boolean') {
      return docObj.hidden;
    }
    return docObj.visibilityState === 'hidden';
  }

  /**
   * Creates a running Clasifica round timer. `options.durationMs` overrides
   * the default bonus window; `options.now` overrides the clock (defaults
   * to `Date.now`); `options.documentObj` overrides which `document`-like
   * object to listen to (defaults to the global `document` when available);
   * `options.autoListen: false` skips subscribing to `visibilitychange`,
   * leaving `pause()`/`resume()` fully caller-driven.
   */
  function createTimer(options) {
    options = options || {};

    var durationMs = Number.isFinite(options.durationMs) && options.durationMs > 0
      ? options.durationMs
      : DEFAULT_BONUS_WINDOW_MS;
    var nowFn = options.now || function () {
      return Date.now();
    };
    var docObj = options.documentObj || (typeof document !== 'undefined' ? document : null);

    var status = STATUS.ACTIVE;
    var elapsedMs = 0;
    var startedAt = nowFn();
    var listening = false;

    function elapsedWhileActive() {
      return status === STATUS.ACTIVE ? elapsedMs + (nowFn() - startedAt) : elapsedMs;
    }

    /** Flips ACTIVE -> EXPIRED the moment the elapsed time reaches durationMs; a no-op otherwise. */
    function refreshExpiry() {
      if (status === STATUS.ACTIVE && elapsedWhileActive() >= durationMs) {
        elapsedMs = durationMs;
        status = STATUS.EXPIRED;
        startedAt = null;
      }
    }

    /** Pauses the clock, banking the elapsed time so far. A no-op when already paused/expired. */
    function pause() {
      refreshExpiry();
      if (status !== STATUS.ACTIVE) {
        return;
      }
      elapsedMs = elapsedWhileActive();
      status = STATUS.PAUSED;
      startedAt = null;
    }

    /**
     * Resumes the clock from exactly the elapsed time it was paused with --
     * the paused interval is never counted. A no-op unless currently paused;
     * if the banked elapsed time already reached durationMs while paused
     * (edge case: it would have expired had it kept running), resuming lands
     * straight on EXPIRED instead of ACTIVE.
     */
    function resume() {
      if (status !== STATUS.PAUSED) {
        return;
      }
      if (elapsedMs >= durationMs) {
        status = STATUS.EXPIRED;
        return;
      }
      status = STATUS.ACTIVE;
      startedAt = nowFn();
    }

    function handleVisibilityChange() {
      if (isDocumentHidden(docObj)) {
        pause();
      } else {
        resume();
      }
    }

    function startListening() {
      if (listening || !docObj || typeof docObj.addEventListener !== 'function') {
        return;
      }
      docObj.addEventListener('visibilitychange', handleVisibilityChange);
      listening = true;
    }

    /** Detaches the `visibilitychange` listener; safe to call more than once. */
    function off() {
      if (!listening || !docObj || typeof docObj.removeEventListener !== 'function') {
        return;
      }
      docObj.removeEventListener('visibilitychange', handleVisibilityChange);
      listening = false;
    }

    /**
     * Current `{ status, elapsedMs, remainingMs, bonusEligible }`. `status`
     * is one of STATUS's three values; `bonusEligible` is true for
     * ACTIVE/PAUSED and false once EXPIRED -- the only effect expiry ever
     * has, the round itself stays answerable regardless.
     */
    function getState() {
      refreshExpiry();
      var elapsed = Math.min(elapsedWhileActive(), durationMs);
      return {
        status: status,
        elapsedMs: elapsed,
        remainingMs: Math.max(0, durationMs - elapsed),
        bonusEligible: status !== STATUS.EXPIRED,
      };
    }

    if (options.autoListen !== false) {
      startListening();
    }

    return {
      pause: pause,
      resume: resume,
      getState: getState,
      off: off,
    };
  }

  var api = {
    STATUS: STATUS,
    DEFAULT_BONUS_WINDOW_MS: DEFAULT_BONUS_WINDOW_MS,
    createTimer: createTimer,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.classifyTimer = api;
  }
})();
