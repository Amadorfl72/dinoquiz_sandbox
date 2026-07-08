'use strict';

/**
 * Answer scoring for the Pregunta/Feedback screen (TRIOFSND-77, TRIOFSND-88).
 *
 * Per PRD AC-7, a wrong answer must never subtract points or otherwise
 * penalize the child — this module only ever adds, never subtracts. A wrong
 * answer always adds exactly zero, so the running total after a failure
 * equals the total before it.
 *
 * Browser bridge: because DinoQuiz ships without a bundler, code the browser
 * runs must live under `public/` and cannot rely on `require`. This module
 * therefore follows the same dual CommonJS/global pattern as
 * public/scripts/homeScreen.js: it registers on `window.DinoQuiz.scoring` for
 * the `<script>`-loaded PWA and also `module.exports` for Node/Jest. The
 * canonical `src/game/scoring.js` re-exports this file so tests and other
 * modules keep a single source of truth.
 */

(function () {
  var POINTS_PER_CORRECT_ANSWER = 1;
  var POINTS_PER_INCORRECT_ANSWER = 0;

  function isAnswerCorrect(question, selectedIndex) {
    return question.correctAnswerIndex === selectedIndex;
  }

  function computeScoreDelta(isCorrect) {
    return isCorrect ? POINTS_PER_CORRECT_ANSWER : POINTS_PER_INCORRECT_ANSWER;
  }

  /** +1 point on a correct answer, the score is left untouched otherwise (no penalty). */
  function applyAnswerToScore(score, isCorrect) {
    return isCorrect ? score + 1 : score;
  }

  function applyAnswer(currentScore, isCorrect) {
    var delta = computeScoreDelta(isCorrect);
    return {
      score: currentScore + delta,
      delta: delta,
      isCorrect: isCorrect,
    };
  }

  var api = {
    POINTS_PER_CORRECT_ANSWER: POINTS_PER_CORRECT_ANSWER,
    POINTS_PER_INCORRECT_ANSWER: POINTS_PER_INCORRECT_ANSWER,
    isAnswerCorrect: isAnswerCorrect,
    computeScoreDelta: computeScoreDelta,
    applyAnswerToScore: applyAnswerToScore,
    applyAnswer: applyAnswer,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.scoring = api;
  }
})();
