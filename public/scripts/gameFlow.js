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
 * pool can't cover. With the real 40-question bank and 10-question games
 * this always yields a replay fully disjoint from the previous game (30
 * fresh candidates for 10 slots); smaller banks degrade gracefully to
 * reusing prior questions instead of throwing.
 *
 * Browser bridge: DinoQuiz has no bundler, so the app shell (main.js) cannot
 * `require` this from `src/` at runtime. This module lives under `public/`
 * and follows the same dual CommonJS/global pattern as
 * public/scripts/homeScreen.js — it registers on `window.DinoQuiz.game` for
 * the `<script>`-loaded PWA and also `module.exports` for Node/Jest. The
 * canonical `src/game/gameFlow.js` re-exports this file, which is the single
 * reusable selection engine called from both Inicio (first game) and
 * Resultados ("Volver a jugar") via public/scripts/main.js.
 */

(function () {
  var QUESTIONS_PER_GAME = 10;

  function createInitialGameState() {
    return { score: 0, questionIndex: 0, answers: [] };
  }

  /** Fisher-Yates shuffle; does not mutate the input array. `randomFn` is injectable for tests. */
  function shuffle(items, randomFn) {
    var random = randomFn || Math.random;
    var shuffled = items.slice();

    for (var i = shuffled.length - 1; i > 0; i -= 1) {
      var j = Math.floor(random() * (i + 1));
      var temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled;
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

  var api = {
    QUESTIONS_PER_GAME: QUESTIONS_PER_GAME,
    createInitialGameState: createInitialGameState,
    shuffle: shuffle,
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
