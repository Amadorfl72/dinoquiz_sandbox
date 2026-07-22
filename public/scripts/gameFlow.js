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
 *
 * Partida validation (TRIOFSND-99/TRIOFSND-102): `startNewGame` only ever
 * returns a session backed by exactly `QUESTIONS_PER_GAME` questions with
 * stable, unique IDs -- if the bank can't provide that (e.g. fewer than 10
 * questions), it returns `null` instead of a partial game. When the caller
 * passes `options.previousQuestionIds` (a replay), the returned session's
 * question-ID *set* is guaranteed to differ from that previous set, even
 * when reordered -- if the bank genuinely cannot offer a different set (e.g.
 * it has exactly `QUESTIONS_PER_GAME` questions total), `startNewGame`
 * returns `null` rather than presenting the same partida again. The app
 * shell (main.js) is the single place that increments the `partida_iniciada`
 * analytics counter, and only after this validation succeeds.
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

  /** Order-independent equality: same size and every ID present in both. */
  function idSetsMatch(idsA, idsB) {
    if (idsA.length !== idsB.length) {
      return false;
    }
    var setB = new Set(idsB);
    return idsA.every(function (id) {
      return setB.has(id);
    });
  }

  function hasUniqueIds(selected) {
    return new Set(selected.map(function (question) { return question.id; })).size === selected.length;
  }

  /**
   * Selects a valid `count`-question subset: exactly `count` questions with
   * unique IDs and, when `previousIds` is given, an ID set that differs from
   * it (ignoring order). Returns `null` if the bank cannot satisfy that --
   * never a partial or repeated selection.
   */
  function selectValidGameQuestions(questions, count, randomFn, previousIds) {
    var selected = selectGameQuestions(questions, count, randomFn);

    if (selected.length !== count || !hasUniqueIds(selected)) {
      return null;
    }

    if (Array.isArray(previousIds) && previousIds.length > 0) {
      var selectedIds = selected.map(function (question) { return question.id; });

      if (idSetsMatch(selectedIds, previousIds)) {
        // Deterministic tie-break instead of hoping another random draw
        // differs: swap in a bank question the current selection excludes.
        var previousIdSet = new Set(previousIds);
        var replacement = questions.find(function (question) {
          return !previousIdSet.has(question.id);
        });

        if (!replacement) {
          return null;
        }

        selected = selected.slice(0, count - 1).concat([replacement]);

        if (!hasUniqueIds(selected)) {
          return null;
        }
      }
    }

    return selected;
  }

  /**
   * Bundles a fresh game state with a validated `count`-question subset, or
   * `null` if the bank can't produce one (see the module docblock above).
   */
  function startNewGame(questions, options) {
    options = options || {};
    var count = options.count === undefined ? QUESTIONS_PER_GAME : options.count;
    var selected = selectValidGameQuestions(questions, count, options.randomFn, options.previousQuestionIds);

    if (!selected) {
      return null;
    }

    return {
      state: createInitialGameState(),
      questions: selected,
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
