'use strict';

/**
 * Pure scoring rules for answer feedback (see PRD: "Suma de +1 punto solo en
 * caso de acierto" / AC-7 "Un fallo nunca descresta puntos"). A wrong answer
 * never subtracts, resets or otherwise changes the score — it always adds
 * exactly zero, so the running total after a failure equals the total before it.
 */

const POINTS_PER_CORRECT_ANSWER = 1;
const POINTS_PER_INCORRECT_ANSWER = 0;

function computeScoreDelta(isCorrect) {
  return isCorrect ? POINTS_PER_CORRECT_ANSWER : POINTS_PER_INCORRECT_ANSWER;
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
  computeScoreDelta,
  applyAnswer,
};
