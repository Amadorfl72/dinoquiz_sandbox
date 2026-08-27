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
 *
 * Common percentage/stars normalization (TRIOFSND-251): the eight modes each
 * score a 10-round game their own way (Quiz/Laberinto/Parejas/Clasifica all
 * apply this file's own `applyAnswer`, but a future mode's "score" need not
 * be a 0-10 tally at all). `normalizeOutcome(score, maxScore)` is the one
 * mode-agnostic conversion from whatever pair a mode ends a game with into
 * the shared 0-100 percentage and 1-3 star tier every results screen renders
 * against, so every mode's results land on the same visual scale regardless
 * of its own scoring representation. `resultsScreen.js`'s `calculateStars`
 * (Quiz, fixed 0-10 scale) delegates here rather than keeping its own
 * separate tier table.
 */

(function () {
  var POINTS_PER_CORRECT_ANSWER = 1;
  var POINTS_PER_INCORRECT_ANSWER = 0;
  var MAX_STARS = 3;

  // Star tiers as a percentage of a mode's own maxScore, so any mode's
  // 10-round outcome maps onto the same 1-3 star scale: 0-30% -> 1 star,
  // 31-60% -> 2 stars, 61-100% -> 3 stars. Mirrors the Quiz-specific
  // 0-3/4-6/7-10 (out of 10) tiers this generalizes.
  var PERCENTAGE_STAR_TIERS = Object.freeze([
    { maxPercentage: 30, stars: 1 },
    { maxPercentage: 60, stars: 2 },
    { maxPercentage: 100, stars: 3 },
  ]);

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

  /** A mode's score out of its own maxScore, as a 0-100 whole percentage. */
  function calculatePercentage(score, maxScore) {
    if (!Number.isFinite(maxScore) || maxScore <= 0) {
      throw new Error('maxScore must be a positive number, got ' + maxScore);
    }
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      throw new Error('score must be a number between 0 and ' + maxScore + ', got ' + score);
    }

    return Math.round((score / maxScore) * 100);
  }

  /** Maps a 0-100 percentage onto the shared 1-3 star tier, per PERCENTAGE_STAR_TIERS. */
  function calculateStarTier(percentage) {
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error('percentage must be a number between 0 and 100, got ' + percentage);
    }

    var tier = PERCENTAGE_STAR_TIERS.find(function (candidate) {
      return percentage <= candidate.maxPercentage;
    });
    return tier.stars;
  }

  /**
   * Converts any mode's 10-round outcome (`score` out of that mode's own
   * `maxScore`) into the shared scale every results screen renders: a 0-100
   * percentage and its 1-3 star tier. The only mode-specific input is the
   * `score`/`maxScore` pair -- how a mode arrived at that pair (aciertos,
   * moves, matches...) never needs to reach this function.
   */
  function normalizeOutcome(score, maxScore) {
    var percentage = calculatePercentage(score, maxScore);
    return {
      percentage: percentage,
      stars: calculateStarTier(percentage),
    };
  }

  var api = {
    POINTS_PER_CORRECT_ANSWER: POINTS_PER_CORRECT_ANSWER,
    POINTS_PER_INCORRECT_ANSWER: POINTS_PER_INCORRECT_ANSWER,
    MAX_STARS: MAX_STARS,
    PERCENTAGE_STAR_TIERS: PERCENTAGE_STAR_TIERS,
    isAnswerCorrect: isAnswerCorrect,
    computeScoreDelta: computeScoreDelta,
    applyAnswerToScore: applyAnswerToScore,
    applyAnswer: applyAnswer,
    calculatePercentage: calculatePercentage,
    calculateStarTier: calculateStarTier,
    normalizeOutcome: normalizeOutcome,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof window !== 'undefined') {
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.scoring = api;
  }
})();
