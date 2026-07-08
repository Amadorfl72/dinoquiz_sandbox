'use strict';

/**
 * Answer scoring for the Pregunta/Feedback screen (TRIOFSND-77).
 *
 * Per PRD AC-7, a wrong answer must never subtract points or otherwise
 * penalize the child — this module only ever adds, never subtracts.
 */

function isAnswerCorrect(question, selectedIndex) {
  return question.correctAnswerIndex === selectedIndex;
}

/** +1 point on a correct answer, the score is left untouched otherwise (no penalty). */
function applyAnswerToScore(score, isCorrect) {
  return isCorrect ? score + 1 : score;
}

module.exports = { isAnswerCorrect, applyAnswerToScore };
