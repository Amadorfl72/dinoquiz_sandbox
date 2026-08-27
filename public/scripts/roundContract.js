'use strict';

/**
 * Common game/round contract for the eight DinoQuiz modes (TRIOFSND-241).
 *
 * Quiz and Laberinto each grew their own "start a game, run N rounds, score
 * an answer, end the game" orchestration (gameFlow.js/mazeGame.js, and the
 * `answered`/`advance()` guards hand-rolled again in main.js for each). The
 * six remaining modes need the exact same shape -- exactly ROUNDS_PER_GAME
 * (10) rounds, one round generated at a time, one score/aciertos/round
 * update per round, one end-of-game signal -- but each has entirely
 * different round content (a maze, a shadow silhouette, a pair of cards...).
 * This module factors that shared shape out so no ninth mode reinvents it.
 *
 * Two explicit steps per round, mirroring the real Quiz/Laberinto screens
 * (questionScreen.js's `handleSelect` scores immediately on tap and only
 * *later*, after `MIN_ADVANCE_DELAY_MS`, does main.js's `advance()` move to
 * the next question -- never the same call):
 *
 *   1. `evaluateAnswer(session, response)` -- scores `response.isCorrect`
 *      via scoring.js (reused, not reimplemented) the moment a response
 *      comes in. `session.round.answered` guards a second call on the same
 *      round from counting again: a response is never contabilized more
 *      than once (mirrors questionScreen.js's local `answered` flag and
 *      mazeGame.js's `round.evaluated`), so a double tap/resubmit is
 *      rejected instead of double-scored. This is the only step that
 *      touches `state.score`/`state.answers` ("puntuación"/"aciertos").
 *   2. `advanceRound(session)` -- moves to the next of the injected
 *      `generateRound`'s rounds ("ronda"), or -- once the answered round was
 *      the 10th -- flips `session.status` to `'finished'`, the contract's
 *      single end-of-game signal ("fin"). Only accepts once per round
 *      (requires the current round to be answered and not yet advanced),
 *      so a stray second call never skips two rounds at once.
 *
 * Hooks (PRD "Contrato técnico ... común para los modos"): a session carries
 * a `hooks` registry (`createHooks()`, or one the caller passes in and keeps
 * a reference to) that the contract `emit`s its own lifecycle events on
 * (`HOOK_EVENTS`). Feedback, pause-by-visibility, screen-reader announcements
 * and local diagnostics are all "do something when a round is evaluated /
 * a new round starts / the game ends" concerns -- instead of every mode's
 * screen wiring each of those four by hand, they each call
 * `session.hooks.on(...)` once. The contract itself never imports or knows
 * about any of those four modules, keeping the dependency one-directional.
 *
 * Browser bridge: no bundler, so the app shell loads this as a `<script>`
 * (public/index.html) the same way it loads gameFlow.js -- this file follows
 * that exact dual CommonJS/`window.DinoQuiz` pattern. It nests itself at
 * `window.DinoQuiz.game.roundContract` (mirrors mazeGame.js/mazeGenerator.js
 * nesting under `window.DinoQuiz.game.*`) rather than gameFlow.js's own flat
 * properties, so it never clobbers them. The canonical `src/game/` module
 * re-exports this file so Node/Jest keep a single source of truth.
 */

(function () {
  var ROUNDS_PER_GAME = 10;

  var HOOK_EVENTS = Object.freeze({
    GAME_STARTED: 'game:started',
    ROUND_STARTED: 'round:started',
    ANSWER_REJECTED: 'answer:rejected',
    ANSWER_EVALUATED: 'round:evaluated',
    ROUND_ADVANCE_REJECTED: 'round:advance-rejected',
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed',
    GAME_OVER: 'game:over',
  });

  /** Resolves gameFlow.js under Node/Jest via `require`, or `window.DinoQuiz.game` in the browser -- same fallback shape as gameFlow.js's own resolveQuestionBank. */
  function resolveGameFlow() {
    if (typeof require === 'function') {
      return require('./gameFlow');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game) || null;
  }

  /** Resolves scoring.js the same way, so score deltas stay the single source of truth Quiz already uses -- never reimplemented here. */
  function resolveScoring() {
    if (typeof require === 'function') {
      return require('./scoring');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.scoring) || null;
  }

  /**
   * A small synchronous pub/sub, private to one session. `on` returns an
   * unsubscribe function so a screen can detach its listeners on teardown.
   * A handler that throws is caught and logged (never lets one broken hook,
   * e.g. a diagnostics listener, break the game the child is playing).
   */
  function createHooks() {
    var listeners = {};

    function on(event, handler) {
      if (typeof handler !== 'function') {
        return function off() {};
      }

      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);

      return function off() {
        listeners[event] = (listeners[event] || []).filter(function (registered) {
          return registered !== handler;
        });
      };
    }

    function emit(event, payload) {
      (listeners[event] || []).slice().forEach(function (handler) {
        try {
          handler(payload);
        } catch (error) {
          console.error('DinoQuiz: roundContract hook "' + event + '" threw', error);
        }
      });
    }

    return { on: on, emit: emit };
  }

  /** Wraps `generateRound`'s mode-specific output with the contract's own bookkeeping fields, overriding any same-named field the generator returned. */
  function buildRound(roundIndex, generateRound, context) {
    var data = generateRound(roundIndex, context);
    return Object.assign({}, data, { roundIndex: roundIndex, answered: false });
  }

  /**
   * Starts a fresh game session of exactly ROUNDS_PER_GAME rounds.
   * `options.generateRound(roundIndex, context)` is required -- it is the
   * only mode-specific piece the contract delegates to; everything else
   * (state shape, round count, hooks) is shared. `options.context` is opaque
   * to the contract and simply forwarded to every `generateRound` call and
   * every hook payload (e.g. a level, a seed, a creature pool).
   */
  function startGame(options) {
    options = options || {};

    if (typeof options.generateRound !== 'function') {
      throw new Error('startGame requires options.generateRound to be a function');
    }

    var gameFlow = resolveGameFlow();
    if (!gameFlow || typeof gameFlow.createInitialGameState !== 'function') {
      throw new Error('roundContract requires gameFlow to be available');
    }

    var hooks = options.hooks || createHooks();
    var round = buildRound(0, options.generateRound, options.context);

    hooks.emit(HOOK_EVENTS.GAME_STARTED, { roundCount: ROUNDS_PER_GAME, context: options.context });
    hooks.emit(HOOK_EVENTS.ROUND_STARTED, { roundIndex: 0, round: round, context: options.context });

    return {
      roundCount: ROUNDS_PER_GAME,
      generateRound: options.generateRound,
      context: options.context,
      hooks: hooks,
      state: gameFlow.createInitialGameState(),
      roundIndex: 0,
      round: round,
      status: 'playing',
    };
  }

  /**
   * Evaluates one response for the session's current round (AC: bloquear
   * envíos duplicados -- una respuesta no se contabiliza más de una vez).
   * `response.isCorrect` (boolean) drives scoring via scoring.js; any other
   * fields on `response` are carried into `state.answers` verbatim (mirrors
   * gameFlow.js/mazeGame.js's own answers shape, extended per mode).
   *
   * Rejected (not counted, `session` returned unchanged) when the current
   * round was already answered, or the game is paused/finished -- so a
   * double tap or a stray resubmit never double-scores. Otherwise updates
   * `state.score`/`state.answers` exactly once and marks the round answered;
   * it never advances `roundIndex` itself -- that is `advanceRound`'s job,
   * called once the mode's own feedback/delay step is done.
   */
  function evaluateAnswer(session, response) {
    response = response || {};

    if (!session || !session.round) {
      throw new Error('evaluateAnswer requires an active session (see startGame)');
    }

    if (session.status !== 'playing' || session.round.answered) {
      session.hooks.emit(HOOK_EVENTS.ANSWER_REJECTED, {
        roundIndex: session.roundIndex,
        reason: session.status !== 'playing' ? session.status : 'duplicate',
        response: response,
      });
      return { session: session, accepted: false };
    }

    var scoring = resolveScoring();
    if (!scoring || typeof scoring.applyAnswer !== 'function') {
      throw new Error('roundContract requires scoring to be available');
    }

    var isCorrect = Boolean(response.isCorrect);
    var scored = scoring.applyAnswer(session.state.score, isCorrect);
    var answer = Object.assign({}, response, { roundIndex: session.roundIndex, isCorrect: isCorrect });
    var nextState = {
      score: scored.score,
      questionIndex: session.state.questionIndex + 1,
      answers: session.state.answers.concat([answer]),
    };
    var answeredRound = Object.assign({}, session.round, { answered: true, isCorrect: isCorrect });
    var nextSession = Object.assign({}, session, { state: nextState, round: answeredRound });

    session.hooks.emit(HOOK_EVENTS.ANSWER_EVALUATED, {
      roundIndex: session.roundIndex,
      answer: answer,
      state: nextState,
      isLastRound: session.roundIndex + 1 >= session.roundCount,
    });

    return { session: nextSession, accepted: true };
  }

  /**
   * Advances past the session's current round ("ronda" in the AC) -- once
   * ROUNDS_PER_GAME rounds have been answered this is what flips
   * `session.status` to `'finished'` (the contract's single end-of-game
   * signal), otherwise it starts the next round via the injected
   * `generateRound`. A no-op (returns `session` unchanged, `accepted:
   * false`) unless the current round was already evaluated and the game is
   * still `'playing'` -- so this too only ever runs once per round: calling
   * it again on the session it just returned finds a fresh, unanswered
   * round and is rejected.
   */
  function advanceRound(session) {
    if (!session || session.status !== 'playing' || !session.round.answered) {
      if (session && session.hooks) {
        session.hooks.emit(HOOK_EVENTS.ROUND_ADVANCE_REJECTED, { roundIndex: session.roundIndex });
      }
      return { session: session, accepted: false, gameOver: false };
    }

    var nextRoundIndex = session.roundIndex + 1;

    if (nextRoundIndex >= session.roundCount) {
      var finishedSession = Object.assign({}, session, { status: 'finished' });
      session.hooks.emit(HOOK_EVENTS.GAME_OVER, { state: session.state, context: session.context });
      return { session: finishedSession, accepted: true, gameOver: true };
    }

    var nextRound = buildRound(nextRoundIndex, session.generateRound, session.context);
    var nextSession = Object.assign({}, session, { roundIndex: nextRoundIndex, round: nextRound });

    session.hooks.emit(HOOK_EVENTS.ROUND_STARTED, { roundIndex: nextRoundIndex, round: nextRound, context: session.context });

    return { session: nextSession, accepted: true, gameOver: false };
  }

  /**
   * Pauses a playing session (e.g. the tab losing visibility): `evaluateAnswer`
   * and `advanceRound` both reject while paused, so a round can never be
   * scored or advanced while the child isn't looking at the screen. A no-op
   * (returns `session` unchanged) when the session isn't currently `'playing'`.
   */
  function pauseGame(session) {
    if (!session || session.status !== 'playing') {
      return session;
    }

    var paused = Object.assign({}, session, { status: 'paused' });
    session.hooks.emit(HOOK_EVENTS.GAME_PAUSED, { roundIndex: session.roundIndex, context: session.context });
    return paused;
  }

  /** Resumes a paused session. A no-op (returns `session` unchanged) when the session isn't currently `'paused'`. */
  function resumeGame(session) {
    if (!session || session.status !== 'paused') {
      return session;
    }

    var resumed = Object.assign({}, session, { status: 'playing' });
    session.hooks.emit(HOOK_EVENTS.GAME_RESUMED, { roundIndex: session.roundIndex, context: session.context });
    return resumed;
  }

  var api = {
    ROUNDS_PER_GAME: ROUNDS_PER_GAME,
    HOOK_EVENTS: HOOK_EVENTS,
    createHooks: createHooks,
    startGame: startGame,
    evaluateAnswer: evaluateAnswer,
    advanceRound: advanceRound,
    pauseGame: pauseGame,
    resumeGame: resumeGame,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = window.DinoQuiz.game || {};
    window.DinoQuiz.game.roundContract = api;
  }
})();
