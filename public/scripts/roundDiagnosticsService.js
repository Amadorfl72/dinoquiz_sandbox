'use strict';

/**
 * Round-contract diagnostics service (TRIOFSND-246, PRD "Diagnóstico y
 * métricas agregadas almacenadas únicamente en el dispositivo").
 *
 * Every one of the eight modes eventually drives its rounds through the
 * shared session hooks (src/game/roundContract.js) instead of hand-rolling
 * its own "tally started/completed/abandoned" calls the way
 * gameFlow.js/mazeGame.js already do for Quiz/Laberinto (see logging.js's
 * Laberinto-only per-level counters). This service attaches once to a live
 * roundContract session and tallies the same shape generically, keyed by
 * `modeId`+`level` instead of level alone, via logging.js's `logRoundGame*`
 * counters -- one attach call per mode screen, none of them reimplementing
 * this bookkeeping by hand.
 *
 * Round-generation failures: a mode's own `generateRound` (e.g.
 * src/game/sizeOrderRoundGenerator.js's `generateSizeOrderRound`) signals it
 * could not build an unambiguous round by returning `{ error: <code>, ... }`
 * instead of a real round (mirrors mazeGenerator.js's own
 * `maze_generation_failed` shape) -- "persisting/logging that failure is
 * left to the caller", per that module's own doc comment. roundContract.js's
 * `buildRound` merges that object into the round unchanged and it surfaces
 * on the session/via `ROUND_STARTED` -- this service inspects `round.error`
 * there and tallies it via `logRoundGenerationFailure(modeId, code)`, the
 * stable code alone, never any round content (creature ids, prompts,
 * seeds...).
 *
 * Started/completed/abandoned: `GAME_STARTED` already fired by the time a
 * caller can attach (same reason visibilityPauseService.js's own
 * `attachToSession` never hooks it either), so "iniciada" is tallied
 * immediately on attach instead, from the session handed in. `GAME_OVER`
 * tallies "completada"; calling the returned `off()` before `GAME_OVER` ever
 * fired (e.g. the player leaves the mode mid-game) tallies "abandonada"
 * instead -- exactly one of the two, whichever happens first, and `off()` is
 * idempotent (a second call is a no-op).
 *
 * Browser bridge: no bundler, so this follows the same dual CommonJS/
 * `window.DinoQuiz` pattern as visibilityPauseService.js/feedbackComponent.js
 * -- registers on `window.DinoQuiz.services.roundDiagnosticsService`; the
 * canonical `src/services/roundDiagnosticsService.js` re-exports it for
 * Node/Jest.
 */

(function () {
  /** Resolves roundContract.js under Node/Jest via `require`, or `window.DinoQuiz.game` in the browser -- same fallback shape roundContract.js's siblings already use. */
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

  /** Resolves a ready-to-use LogService instance, same dual pattern as modeSelectorScreen.js's own resolveLogService. */
  function resolveLogService(options) {
    options = options || {};
    if (options.logService) {
      return options.logService;
    }

    var win = typeof window !== 'undefined' ? window : undefined;
    var LogServiceCtor =
      (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.logging && win.DinoQuiz.services.logging.LogService) ||
      (typeof require === 'function' ? require('../../src/services/logging').LogService : undefined);

    if (typeof LogServiceCtor !== 'function') {
      return null;
    }
    return new LogServiceCtor();
  }

  var noopDiagnostics = { incrementCounter: function () {}, recordError: function () {} };

  /**
   * Resolves public/scripts/diagnosticsService.js (TRIOFSND-317/318), same
   * dual-pattern/`options` override shape as `resolveLogService` above --
   * registered on `window.DinoQuiz.services.diagnostics` (see that file),
   * so this resolves the real service in the unbundled browser too, not
   * just under Node/Jest. Falls back to a no-op so a caller that never
   * wires it up (or a script that genuinely failed to load) never breaks
   * round-contract game flow.
   */
  function resolveDiagnostics(options) {
    options = options || {};
    if (options.diagnostics) {
      return options.diagnostics;
    }

    var win = typeof window !== 'undefined' ? window : undefined;
    var diagnosticsModule =
      (win && win.DinoQuiz && win.DinoQuiz.services && win.DinoQuiz.services.diagnostics) ||
      (typeof require === 'function' ? require('../../src/services/diagnostics') : undefined);

    return diagnosticsModule && typeof diagnosticsModule.incrementCounter === 'function' ? diagnosticsModule : noopDiagnostics;
  }

  /** Tallies `round.error` (a mode's own local round-generation failure code), if present -- never touches anything else about `round`. */
  function reportRoundIfFailed(logService, diagnostics, modeId, round) {
    if (round && typeof round.error === 'string' && round.error) {
      if (logService) {
        logService.logRoundGenerationFailure(modeId, round.error);
      }
      // PRD failure point "fallo de generación de ronda" (TRIOFSND-318): the
      // stable generator code alone, never any other round content.
      diagnostics.recordError(modeId, 'roundGeneration', round.error);
    }
  }

  /**
   * Attaches diagnostics to a live roundContract session for `options.modeId`
   * (required) at `options.level` (optional -- not every mode has a
   * difficulty level; omitted levels are simply tallied together for that
   * mode). Returns `{ off }` -- `off()` detaches the hook subscriptions and,
   * if `game:over` never fired first, tallies "abandonada".
   */
  function attachToSession(session, options) {
    options = options || {};

    if (!session || !session.hooks || typeof session.hooks.on !== 'function') {
      throw new Error('attachToSession requires an active roundContract session (see startGame)');
    }
    if (typeof options.modeId !== 'string' || options.modeId.length === 0) {
      throw new Error('attachToSession requires options.modeId');
    }

    var roundContract = resolveRoundContract(options);
    if (!roundContract || !roundContract.HOOK_EVENTS) {
      throw new Error('attachToSession requires roundContract to be available');
    }

    var logService = resolveLogService(options);
    var diagnostics = resolveDiagnostics(options);
    var modeId = options.modeId;
    var level = options.level === undefined ? null : options.level;
    var finished = false;
    var detached = false;

    if (logService) {
      logService.logRoundGameStarted(modeId, level);
    }
    // TRIOFSND-318: "partida iniciada" for every round-contract mode this
    // service attaches to (Sombra, Parejas, Clasifica, Ordena por tamaño,
    // Oído Jurásico, Línea del tiempo) -- one shared tally instead of a
    // separate call at each mode's own start function.
    diagnostics.incrementCounter('gameStarted:' + modeId);
    reportRoundIfFailed(logService, diagnostics, modeId, session.round);

    var offRoundStarted = session.hooks.on(roundContract.HOOK_EVENTS.ROUND_STARTED, function (payload) {
      reportRoundIfFailed(logService, diagnostics, modeId, payload && payload.round);
    });

    var offGameOver = session.hooks.on(roundContract.HOOK_EVENTS.GAME_OVER, function () {
      finished = true;
      if (logService) {
        logService.logRoundGameCompleted(modeId, level);
      }
      diagnostics.incrementCounter('gameCompleted:' + modeId);
    });

    function off() {
      if (detached) {
        return;
      }
      detached = true;
      offRoundStarted();
      offGameOver();
      if (!finished && logService) {
        logService.logRoundGameAbandoned(modeId, level);
      }
      if (!finished) {
        diagnostics.incrementCounter('gameAbandoned:' + modeId);
      }
    }

    return { off: off };
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
    window.DinoQuiz.services.roundDiagnosticsService = api;
  }
})();
