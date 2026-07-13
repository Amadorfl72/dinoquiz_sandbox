'use strict';

/**
 * Per-game state and new-game setup (TRIOFSND-100).
 *
 * A "game session" tracks the running score, the index of the question the
 * player is currently on, and every answer given so far. `startNewGame`
 * bundles a fresh, reset session together with a random 10-question subset
 * of the bank (AC-3/AC-9: exactly 10 questions, no repetition within the
 * game, and a different subset than the previous game since selection is
 * random and without replacement).
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

  /** Samples `count` questions without replacement, so none repeats within a game. */
  function selectGameQuestions(questions, count, randomFn) {
    if (!Array.isArray(questions)) {
      throw new Error('questions must be an array');
    }

    var sampleSize = count === undefined ? QUESTIONS_PER_GAME : count;
    var random = randomFn || Math.random;

    var pool = questions.slice();
    var selected = [];

    while (selected.length < sampleSize && pool.length > 0) {
      var index = Math.floor(random() * pool.length);
      var safeIndex = Math.min(Math.max(index, 0), pool.length - 1);
      selected.push(pool.splice(safeIndex, 1)[0]);
    }

    return selected;
  }

  function startNewGame(questions, options) {
    options = options || {};
    return {
      state: createInitialGameState(),
      questions: selectGameQuestions(questions, options.count, options.randomFn),
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
