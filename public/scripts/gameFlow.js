'use strict';

/**
 * Per-game state and new-game setup (TRIOFSND-100, extended by TRIOFSND-101).
 *
 * A "game session" tracks the running score, the index of the question the
 * player is currently on, and every answer given so far. `startNewGame`
 * bundles a fresh, reset session together with a random 10-question subset
 * of the bank (AC-3: exactly 10 questions, no repetition within the game).
 *
 * Replay distinctness (TRIOFSND-101, AC-9): callers may pass
 * `options.previousQuestionIds` (the ids played in the immediately previous
 * game) to `startNewGame`/`selectGameQuestions`. When given, the bank is
 * split into a "fresh" pool (questions not in that previous set) and a
 * "repeat" pool (the rest); `selectGameQuestions` shuffles the fresh pool in
 * first and only reaches into the repeat pool to fill any slots the fresh
 * pool can't cover. With the real question bank and 10-question games this
 * always yields a replay fully disjoint from the previous game; smaller
 * banks degrade gracefully to reusing prior questions instead of throwing.
 *
 * Browser bridge: DinoQuiz has no bundler, so the app shell (main.js) cannot
 * `require` this from `src/` at runtime. This module lives under `public/`
 * and follows the same dual CommonJS/global pattern as
 * public/scripts/homeScreen.js — it registers on `window.DinoQuiz.game` for
 * the `<script>`-loaded PWA and also `module.exports` for Node/Jest. The
 * canonical `src/game/gameFlow.js` re-exports this file, which is the single
 * reusable selection engine called from both Inicio (first game) and
 * Resultados ("Volver a jugar") via public/scripts/main.js.
 *
 * End of game (TRIOFSND-95): once the 10th question is answered, the app
 * shell (main.js) needs the game's "racha" (the longest run of consecutive
 * correct answers) alongside the final score before navigating to
 * Resultados. `calculateMaxStreak` derives that from `state.answers` (each
 * entry's `isCorrect` flag, appended in order as the child answers) without
 * the app shell having to track a running streak counter itself.
 *
 * Level selection and progression (TRIOFSND-203): `startLevel` selects the 10
 * questions for a given difficulty level via `src/data/questionBank`'s
 * `getQuestionsByLevel` (TRIOFSND-202) -- which already excludes/logs any
 * individually invalid question -- instead of `selectGameQuestions`'s flat,
 * level-agnostic bank. `resolveLevelOutcome` then decides, once that level's
 * 10 questions are all answered, whether to unlock the next level or end the
 * game, purely from that level's own answers (never a cross-level running
 * tally) and, exclusively for `modeId`'s own progression:
 *   - Completing level 10 (MAX_LEVEL) always ends the game (no mode has more
 *     than MAX_LEVEL levels).
 *   - Below that, `modeId`'s unlock threshold for `level` (TRIOFSND-248, see
 *     unlockThresholds.js) decides -- enough aciertos on THAT level unlocks
 *     and starts the next level of THAT SAME mode, otherwise it ends.
 * `completeLevel` composes the two: it resolves the outcome and, when a next
 * level unlocks, also starts it via `startLevel` in the same call.
 *
 * Per-mode independence (TRIOFSND-249): `resolveLevelOutcome`/`completeLevel`
 * accept `params.modeId`, defaulting to `DEFAULT_MODE_ID` ('quiz'). Every
 * decision -- the unlock threshold looked up and the next level offered --
 * is scoped strictly to that one modeId; nothing here ever reads or mutates
 * another mode's progress, and these functions carry no state of their own
 * between calls (calling them twice with the same level/answers, e.g. a
 * replayed already-cleared level, always returns the same outcome -- there
 * is no counter here to double-increment). There is no age-band exception:
 * `params.ageBand`, when a caller still passes it (e.g. main.js's quiz
 * flow), is accepted but never consulted here -- progression for every
 * mode, including quiz, is governed strictly by that mode/level's
 * `unlockThresholds.js` entry, never by the child's age band.
 *
 * The score needed to unlock the next level (TRIOFSND-248) is no longer a
 * single constant applying to every level of the one mode that used to
 * exist: it is looked up per mode/level via `unlockThresholds.js`'s
 * `getUnlockThreshold(modeId, level)`, resolved the same lazy way
 * `resolveQuestionBank` resolves `src/data/questionBank` below.
 * `LEVEL_UP_MIN_CORRECT` stays exported as the quiz mode's own threshold
 * value for existing callers.
 *
 * Because `src/data/questionBank.js` reads the bank off disk with `fs`, it
 * cannot be loaded as a plain `<script>` in the no-bundler browser runtime
 * (see the module doc comment on that file). `startLevel` therefore resolves
 * it the same way `ageGateScreen.js`'s `resolveDefaultStrings` resolves
 * `src/i18n` -- via `require` under Node/Jest -- and accepts an injectable
 * `options.getQuestionsByLevel` override for callers (e.g. a future browser
 * wiring) that can't rely on `require`.
 */

(function () {
  var QUESTIONS_PER_GAME = 10;

  // Mirrors src/data/questionBank.js's MIN_LEVEL/MAX_LEVEL (TRIOFSND-202):
  // 10 difficulty levels, numbered 1-10.
  var MIN_LEVEL = 1;
  var MAX_LEVEL = 10;

  // TRIOFSND-203 AC: >=6 aciertos (out of the level's 10 questions) unlocks
  // the next level; <=5 ends the game. This is the quiz mode's own threshold
  // in unlockThresholds.js's per-mode/level table (TRIOFSND-248) -- kept
  // exported here as a constant for existing callers.
  var LEVEL_UP_MIN_CORRECT = 6;

  // resolveLevelOutcome/completeLevel default to the quiz mode when no
  // params.modeId is given, preserving pre-TRIOFSND-248 behaviour for
  // existing callers.
  var DEFAULT_MODE_ID = 'quiz';

  // Matches ageGateScreen.js's AGE_BANDS.EIGHT_PLUS value. Kept as a plain
  // string constant here (rather than requiring that screen module) so this
  // game-logic file stays decoupled from a specific UI screen.
  var AGE_BAND_EIGHT_PLUS = 'eight-plus';

  function createInitialGameState() {
    return { score: 0, questionIndex: 0, answers: [] };
  }

  /** Fisher-Yates shuffle; does not mutate the input array. `randomFn` is injectable for tests. */
  function shuffle(items, randomFn) {
    var random = randomFn || Math.random;
    var shuffled = items.slice();

    // Forward Fisher-Yates: j = i + floor(random() * (remaining)). Same
    // uniform distribution as the backward variant, with one property the
    // tests (and any deterministic caller) rely on: a randomFn that returns
    // 0 picks j === i every step, so the order is the IDENTITY. The backward
    // variant maps 0 to "swap with the first slot", silently reversing a
    // 2-element bank — which is how eleven app-shell tests started asserting
    // against the wrong question.
    for (var i = 0; i < shuffled.length - 1; i += 1) {
      var j = i + Math.floor(random() * (shuffled.length - i));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled;
  }

  /** Longest run of consecutive correct answers, in the order they were given. */
  function calculateMaxStreak(answers) {
    if (!Array.isArray(answers)) {
      return 0;
    }

    var maxStreak = 0;
    var currentStreak = 0;

    answers.forEach(function (answer) {
      if (answer && answer.isCorrect) {
        currentStreak += 1;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return maxStreak;
  }

  /**
   * Samples `count` questions without replacement, so none repeats within a
   * game (AC-3). `previousQuestionIds`, when given, is used to prefer
   * questions that were not part of that previous game (AC-9) — see the
   * module doc comment above for the fresh/repeat pool strategy.
   */
  function selectGameQuestions(questions, count, randomFn, previousQuestionIds) {
    if (!Array.isArray(questions)) {
      throw new Error('questions must be an array');
    }

    var sampleSize = count === undefined ? QUESTIONS_PER_GAME : count;
    var random = randomFn || Math.random;

    if (previousQuestionIds && previousQuestionIds.length > 0) {
      var previousIds = {};
      previousQuestionIds.forEach(function (id) {
        previousIds[id] = true;
      });

      var freshPool = [];
      var repeatPool = [];
      questions.forEach(function (question) {
        if (Object.prototype.hasOwnProperty.call(previousIds, question.id)) {
          repeatPool.push(question);
        } else {
          freshPool.push(question);
        }
      });

      var ordered = shuffle(freshPool, random).concat(shuffle(repeatPool, random));
      return ordered.slice(0, Math.min(sampleSize, ordered.length));
    }

    return shuffle(questions, random).slice(0, Math.min(sampleSize, questions.length));
  }

  function startNewGame(questions, options) {
    options = options || {};
    return {
      state: createInitialGameState(),
      questions: selectGameQuestions(questions, options.count, options.randomFn, options.previousQuestionIds),
    };
  }

  function isValidLevel(level) {
    return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL;
  }

  function isEightPlusAgeBand(ageBand) {
    return ageBand === AGE_BAND_EIGHT_PLUS;
  }

  /** Resolves `src/data/questionBank` under Node/Jest; see the module doc comment above. */
  function resolveQuestionBank() {
    if (typeof require === 'function') {
      return require('../../src/data/questionBank');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.data && window.DinoQuiz.data.questionBank) || null;
  }

  /** Resolves `src/game/unlockThresholds` (TRIOFSND-248) under Node/Jest, or `window.DinoQuiz.game.unlockThresholds` in the browser. */
  function resolveUnlockThresholds() {
    if (typeof require === 'function') {
      return require('../../src/game/unlockThresholds');
    }
    return (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.game && window.DinoQuiz.game.unlockThresholds) || null;
  }

  /** The aciertos needed to unlock `level + 1` for `modeId`, via unlockThresholds.js's per-mode/level table. */
  function getUnlockThreshold(modeId, level) {
    var unlockThresholds = resolveUnlockThresholds();
    if (!unlockThresholds || typeof unlockThresholds.getUnlockThreshold !== 'function') {
      throw new Error('unlockThresholds module is not available');
    }
    return unlockThresholds.getUnlockThreshold(modeId, level);
  }

  var noopLogService = { logEvent: function () {} };
  var defaultLogService;

  /** Lazily resolves a shared LogService (Node/Jest via `require`, browser via `window.DinoQuiz`), falling back to a no-op. */
  function resolveDefaultLogService() {
    if (defaultLogService) {
      return defaultLogService;
    }

    var loggingModule = typeof require === 'function'
      ? require('../../src/services/logging')
      : (typeof window !== 'undefined' && window.DinoQuiz && window.DinoQuiz.services && window.DinoQuiz.services.logging);

    defaultLogService = loggingModule && typeof loggingModule.LogService === 'function'
      ? new loggingModule.LogService()
      : noopLogService;

    return defaultLogService;
  }

  /** Every valid question for `level` (TRIOFSND-202's own validation/logging applies, not repeated here). */
  function getLevelQuestionPool(level, options) {
    if (typeof options.getQuestionsByLevel === 'function') {
      return options.getQuestionsByLevel(level, options);
    }

    var questionBank = resolveQuestionBank();
    if (!questionBank || typeof questionBank.getQuestionsByLevel !== 'function') {
      throw new Error('getQuestionsByLevel is not available; pass options.getQuestionsByLevel');
    }

    return questionBank.getQuestionsByLevel(level, options);
  }

  /**
   * Starts a level: selects QUESTIONS_PER_GAME unique random questions from
   * that level's valid pool (TRIOFSND-203), via `getQuestionsByLevel`
   * (`options.getQuestionsByLevel`, or `src/data/questionBank`'s by
   * default -- see the module doc comment above).
   *
   * When the level doesn't have QUESTIONS_PER_GAME valid questions left
   * (e.g. TRIOFSND-202's own validation stripped too many), no game is
   * started: a `level_generation_failed` event is logged with the level and
   * the number of valid questions found -- no personal data -- and an error
   * result is returned instead of throwing, so one broken level never
   * crashes the app shell.
   */
  function startLevel(level, options) {
    options = options || {};

    if (!isValidLevel(level)) {
      throw new Error('level must be an integer between ' + MIN_LEVEL + ' and ' + MAX_LEVEL);
    }

    var logService = options.logService || resolveDefaultLogService();
    var pool = getLevelQuestionPool(level, options);
    var validQuestionCount = Array.isArray(pool) ? pool.length : 0;

    if (validQuestionCount < QUESTIONS_PER_GAME) {
      logService.logEvent('level_generation_failed', { level: level, validQuestionCount: validQuestionCount });
      return { error: 'level_generation_failed', level: level, validQuestionCount: validQuestionCount };
    }

    return {
      level: level,
      state: createInitialGameState(),
      questions: selectGameQuestions(pool, QUESTIONS_PER_GAME, options.randomFn, options.previousQuestionIds),
    };
  }

  /** Correct answers among `answers` (e.g. a level's `state.answers`) -- exclusively that level's tally, never a cross-level running total. */
  function countCorrectAnswers(answers) {
    if (!Array.isArray(answers)) {
      return 0;
    }

    return answers.reduce(function (count, answer) {
      return count + (answer && answer.isCorrect ? 1 : 0);
    }, 0);
  }

  /**
   * Decides what happens once a level's 10 questions are all answered
   * (TRIOFSND-203, generalized per-mode in TRIOFSND-249): unlock the next
   * level, or end the game -- scoped strictly to `modeId`. `params`:
   *   - `level`: the level that was just completed (1-MAX_LEVEL).
   *   - `answers`: that level's own answers (never a cross-level total --
   *     `countCorrectAnswers` derives the tally from these alone).
   *   - `modeId`: which mode's unlock threshold to use (TRIOFSND-248, see
   *     unlockThresholds.js); defaults to `'quiz'` (DEFAULT_MODE_ID). Every
   *     other mode's progress is untouched by this call.
   *   - `ageBand`: accepted for callers that still pass it (e.g. main.js's
   *     quiz flow, see ageGateScreen.js) but never consulted here -- it has
   *     no effect on the outcome for any mode, quiz included (TRIOFSND-249).
   *
   * Completing MAX_LEVEL always ends the game (no mode has more than
   * MAX_LEVEL levels); below that, `level` unlocks `level + 1` of the SAME
   * mode once `answers` has at least `modeId`'s unlock threshold for `level`
   * aciertos, otherwise the game ends. This applies uniformly to every mode,
   * including quiz: there is no age-band exception.
   */
  function resolveLevelOutcome(params) {
    params = params || {};
    var level = params.level;

    if (!isValidLevel(level)) {
      throw new Error('level must be an integer between ' + MIN_LEVEL + ' and ' + MAX_LEVEL);
    }

    var modeId = params.modeId || DEFAULT_MODE_ID;
    var correctCount = countCorrectAnswers(params.answers);

    if (level >= MAX_LEVEL) {
      return { gameOver: true, nextLevel: null, level: level, correctCount: correctCount, reason: 'completed_all_levels' };
    }

    if (correctCount >= getUnlockThreshold(modeId, level)) {
      return { gameOver: false, nextLevel: level + 1, level: level, correctCount: correctCount, reason: 'level_up' };
    }

    return { gameOver: true, nextLevel: null, level: level, correctCount: correctCount, reason: 'insufficient_score' };
  }

  /**
   * Composes `resolveLevelOutcome` and `startLevel`: resolves what happens
   * when a level's 10 questions are all answered and, when a next level
   * unlocks, also starts it (attached as `nextLevelGame`) so callers get a
   * ready-to-play session in one call. `params` is forwarded to `startLevel`
   * as its `options` (so `randomFn`/`previousQuestionIds`/`logService`/
   * `getQuestionsByLevel` all apply to the next level too).
   */
  function completeLevel(params) {
    params = params || {};
    var outcome = resolveLevelOutcome(params);

    if (outcome.gameOver) {
      return outcome;
    }

    outcome.nextLevelGame = startLevel(outcome.nextLevel, params);
    return outcome;
  }

  var api = {
    QUESTIONS_PER_GAME: QUESTIONS_PER_GAME,
    MIN_LEVEL: MIN_LEVEL,
    MAX_LEVEL: MAX_LEVEL,
    LEVEL_UP_MIN_CORRECT: LEVEL_UP_MIN_CORRECT,
    DEFAULT_MODE_ID: DEFAULT_MODE_ID,
    AGE_BAND_EIGHT_PLUS: AGE_BAND_EIGHT_PLUS,
    createInitialGameState: createInitialGameState,
    shuffle: shuffle,
    calculateMaxStreak: calculateMaxStreak,
    selectGameQuestions: selectGameQuestions,
    startNewGame: startNewGame,
    isValidLevel: isValidLevel,
    isEightPlusAgeBand: isEightPlusAgeBand,
    startLevel: startLevel,
    countCorrectAnswers: countCorrectAnswers,
    getUnlockThreshold: getUnlockThreshold,
    resolveLevelOutcome: resolveLevelOutcome,
    completeLevel: completeLevel,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = api;
  }
})();
