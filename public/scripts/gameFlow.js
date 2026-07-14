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
 * "repeat" pool (the rest); the fresh pool is sampled first and the repeat
 * pool only fills whatever slots the fresh pool can't cover. With the real
 * 40-question bank and 10-question games this always yields a replay fully
 * disjoint from the previous game (30 fresh candidates for 10 slots);
 * smaller banks degrade gracefully to reusing prior questions instead of
 * throwing.
 *
 * Browser bridge: DinoQuiz has no bundler, so the app shell (main.js) cannot
 * `require` this from `src/` at runtime. This module lives under `public/`
 * and follows the same dual CommonJS/global pattern as
 * public/scripts/homeScreen.js — it registers on `window.DinoQuiz.game` for
 * the `<script>`-loaded PWA and also `module.exports` for Node/Jest. The
 * canonical `src/game/gameFlow.js` re-exports this file.
 *
 * End of game (TRIOFSND-95): once the 10th question is answered, the app
 * shell (main.js) needs the game's "racha" (the longest run of consecutive
 * correct answers) alongside the final score before navigating to
 * Resultados. `calculateMaxStreak` derives that from `state.answers` (each
 * entry's `isCorrect` flag, appended in order as the child answers) without
 * the app shell having to track a running streak counter itself.
 */

(function () {
  var QUESTIONS_PER_GAME = 10;

  function createInitialGameState() {
    return { score: 0, questionIndex: 0, answers: [] };
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

  /** Samples up to `count` questions without replacement from `pool` (mutates a local copy only). */
  function sampleWithoutReplacement(pool, count, random) {
    var remaining = pool.slice();
    var selected = [];

    while (selected.length < count && remaining.length > 0) {
      var index = Math.floor(random() * remaining.length);
      var safeIndex = Math.min(Math.max(index, 0), remaining.length - 1);
      selected.push(remaining.splice(safeIndex, 1)[0]);
    }

    return selected;
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

    if (!previousQuestionIds || previousQuestionIds.length === 0) {
      return sampleWithoutReplacement(questions, sampleSize, random);
    }

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

    var selected = sampleWithoutReplacement(freshPool, sampleSize, random);
    if (selected.length < sampleSize) {
      selected = selected.concat(sampleWithoutReplacement(repeatPool, sampleSize - selected.length, random));
    }

    return selected;
  }

  function startNewGame(questions, options) {
    options = options || {};
    return {
      state: createInitialGameState(),
      questions: selectGameQuestions(questions, options.count, options.randomFn, options.previousQuestionIds),
    };
  }

  var api = {
    QUESTIONS_PER_GAME: QUESTIONS_PER_GAME,
    createInitialGameState: createInitialGameState,
    calculateMaxStreak: calculateMaxStreak,
    selectGameQuestions: selectGameQuestions,
    startNewGame: startNewGame,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.game = api;
  }
})();
