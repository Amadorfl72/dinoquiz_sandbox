'use strict';

/**
 * Answer scoring for the Pregunta/Feedback screen (TRIOFSND-77, TRIOFSND-88).
 *
 * Per PRD AC-7, a wrong answer must never subtract points or otherwise
 * penalize the child — this module only ever adds, never subtracts. A wrong
 * answer always adds exactly zero, so the running total after a failure
 * equals the total before it.
 */

const POINTS_PER_CORRECT_ANSWER = 1;
const POINTS_PER_INCORRECT_ANSWER = 0;

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
  const delta = computeScoreDelta(isCorrect);
  return {
    score: currentScore + delta,
    delta,
    isCorrect,
  };
}

module.exports = {
  POINTS_PER_CORRECT_ANSWER,
  POINTS_PER_INCORRECT_ANSWER,
  isAnswerCorrect,
  computeScoreDelta,
  applyAnswerToScore,
  applyAnswer,
};
