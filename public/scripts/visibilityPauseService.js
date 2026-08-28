'use strict';

/**
 * Pause-by-visibility service (TRIOFSND-244).
 *
 * Listens for the document's `visibilitychange` event and, the moment the
 * tab is hidden (child switches app / locks the screen / answers a phone
 * call), pauses whatever the current round has running -- any registered
 * countdown timer and any registered `<audio>` playback -- and pauses the
 * roundContract session itself via `pauseGame` (see roundContract.js). Per
 * roundContract's own contract, a `'paused'` session rejects `evaluateAnswer`
 * and `advanceRound`, so nothing the child can no longer see can score,
 * fail-by-timeout or advance while hidden: PRD "sin penalización".
 *
 * When the document becomes visible again, `resumeGame` flips the session
 * back to `'playing'`, every paused timer resumes with EXACTLY the time it
 * had left (the hidden interval is never counted against it) and every
 * paused `<audio>` resumes playback from where it stopped. `options.onResume`
 * is then called with the resumed session so the mode screen can re-render
 * the current round ("mostrando el estado actual") without this service
 * knowing anything about that mode's own DOM.
 *
 * Session access: roundContract sessions are immutable (`pauseGame`/
 * `resumeGame` return a NEW object), so this service never holds its own
 * cached copy -- `options.getSession()`/`options.setSession(next)` are the
 * single source of truth, supplied by whichever mode screen owns the live
 * session variable (mirrors the accessor pattern GameSessionStorage callers
 * already use to read/write a session).
 *
 * Timers/audio registered by a round never leak into the next one: this
 * subscribes to the session's `HOOK_EVENTS.ROUND_STARTED` (skipping the
 * game's own initial round, exactly like feedbackComponent.js's `reset()`
 * wiring) and `HOOK_EVENTS.GAME_OVER` to drop anything still registered.
 *
 * Browser bridge: no bundler, so this file follows the same dual
 * CommonJS/`window.DinoQuiz` pattern as network.js/soundService.js --
 * registers on `window.DinoQuiz.services.visibilityPauseService`; the
 * canonical `src/services/visibilityPauseService.js` re-exports it for
 * Node/Jest.
 */

(function () {
  function resolveRoundContract(options) {
    options = options || {};
    if (options.roundContract) {
      return options.roundContract;
    }
    if (typeof require === 'function') {
      return require('./roundContract');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.roundContract) || null;
  }

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
   * Attaches pause-by-visibility behaviour to a live roundContract session.
   * `options.getSession`/`options.setSession` are required; everything else
   * is optional. Returns `{ registerTimer, registerAudio, off }` -- `off()`
   * detaches the hook subscriptions and the `visibilitychange` listener,
   * mirroring `session.hooks.on`'s own unsubscribe shape.
   */
  function attachToSession(options) {
    options = options || {};

    if (typeof options.getSession !== 'function' || typeof options.setSession !== 'function') {
      throw new Error('attachToSession requires options.getSession and options.setSession');
    }

    var initialSession = options.getSession();
    if (!initialSession || !initialSession.hooks || typeof initialSession.hooks.on !== 'function') {
      throw new Error('attachToSession requires an active roundContract session (see startGame)');
    }

    var roundContract = resolveRoundContract(options);
    if (!roundContract || !roundContract.HOOK_EVENTS) {
      throw new Error('attachToSession requires roundContract to be available');
    }

    var docObj = options.documentObj || (typeof document !== 'undefined' ? document : null);
    var setTimeoutFn = options.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    var clearTimeoutFn = options.clearTimeout || (typeof clearTimeout === 'function' ? clearTimeout : null);
    var nowFn = options.now || function () {
      return Date.now();
    };

    var timers = [];
    var audios = [];

    function clearRegistrations() {
      timers.slice().forEach(function (timer) {
        timer.cancel();
      });
      timers.length = 0;
      audios.length = 0;
    }

    /** A `setTimeout` wrapper that can lose exactly the time it was paused for, never more. */
    function registerTimer(callback, delayMs) {
      if (typeof callback !== 'function' || typeof delayMs !== 'number' || !setTimeoutFn || !clearTimeoutFn) {
        return { cancel: function () {} };
      }

      var remaining = delayMs;
      var startedAt = nowFn();
      var timeoutId = setTimeoutFn(fire, remaining);
      var settled = false;

      function removeFromRegistry() {
        var index = timers.indexOf(controller);
        if (index !== -1) {
          timers.splice(index, 1);
        }
      }

      function fire() {
        settled = true;
        timeoutId = null;
        removeFromRegistry();
        callback();
      }

      var controller = {
        pause: function () {
          if (settled || timeoutId === null) {
            return;
          }
          clearTimeoutFn(timeoutId);
          timeoutId = null;
          remaining = Math.max(0, remaining - (nowFn() - startedAt));
        },
        resume: function () {
          if (settled || timeoutId !== null) {
            return;
          }
          startedAt = nowFn();
          timeoutId = setTimeoutFn(fire, remaining);
        },
        cancel: function () {
          if (settled) {
            return;
          }
          settled = true;
          if (timeoutId !== null) {
            clearTimeoutFn(timeoutId);
            timeoutId = null;
          }
          removeFromRegistry();
        },
      };

      timers.push(controller);
      return { cancel: controller.cancel };
    }

    /** Registers a playing/potentially-playing `<audio>` element so it pauses/resumes with the tab. */
    function registerAudio(audioEl) {
      if (!audioEl) {
        return function unregister() {};
      }

      var entry = { audioEl: audioEl, wasPlaying: false };
      audios.push(entry);

      return function unregister() {
        var index = audios.indexOf(entry);
        if (index !== -1) {
          audios.splice(index, 1);
        }
      };
    }

    function pauseTimers() {
      timers.forEach(function (timer) {
        timer.pause();
      });
    }

    function resumeTimers() {
      timers.forEach(function (timer) {
        timer.resume();
      });
    }

    function pauseAudios() {
      audios.forEach(function (entry) {
        var audioEl = entry.audioEl;
        entry.wasPlaying = !audioEl.paused && !audioEl.ended;
        if (entry.wasPlaying) {
          audioEl.pause();
        }
      });
    }

    function resumeAudios() {
      audios.forEach(function (entry) {
        if (!entry.wasPlaying) {
          return;
        }
        entry.wasPlaying = false;
        try {
          var playResult = entry.audioEl.play();
          if (playResult && typeof playResult.catch === 'function') {
            playResult.catch(function () {
              // Autoplay blocked or the asset failed to decode -- never
              // block resuming the rest of the round for that.
            });
          }
        } catch (error) {
          // Same tolerance as audio.js/soundService.js: a failed resume
          // must never throw back into the visibilitychange handler.
        }
      });
    }

    function handleVisibilityChange() {
      var session = options.getSession();
      if (!session) {
        return;
      }

      if (isDocumentHidden(docObj)) {
        pauseTimers();
        pauseAudios();
        var paused = roundContract.pauseGame(session);
        options.setSession(paused);
        if (typeof options.onPause === 'function') {
          options.onPause(paused);
        }
      } else {
        var resumed = roundContract.resumeGame(session);
        options.setSession(resumed);
        resumeTimers();
        resumeAudios();
        if (typeof options.onResume === 'function') {
          options.onResume(resumed);
        }
      }
    }

    var offRoundStarted = initialSession.hooks.on(roundContract.HOOK_EVENTS.ROUND_STARTED, function (payload) {
      // The session's own game-start ROUND_STARTED (roundIndex 0) fires
      // before a caller can attach -- only later rounds ever need clearing.
      if (payload.roundIndex > 0) {
        clearRegistrations();
      }
    });
    var offGameOver = initialSession.hooks.on(roundContract.HOOK_EVENTS.GAME_OVER, function () {
      clearRegistrations();
    });

    if (docObj && typeof docObj.addEventListener === 'function') {
      docObj.addEventListener('visibilitychange', handleVisibilityChange);
    }

    function off() {
      offRoundStarted();
      offGameOver();
      if (docObj && typeof docObj.removeEventListener === 'function') {
        docObj.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    }

    return {
      registerTimer: registerTimer,
      registerAudio: registerAudio,
      off: off,
    };
  }

  var api = {
    attachToSession: attachToSession,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.services = window.DinoQuiz.services || {};
    window.DinoQuiz.services.visibilityPauseService = api;
  }
})();
