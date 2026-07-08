'use strict';

/**
 * Owns the in-memory state of the current game: score, current question
 * index and the answers given so far. `resetGameState()` is the single
 * source of truth for "starting a new game" — it is what "Volver a jugar"
 * calls so the next game starts from question 1 with a clean score.
 */

function createInitialState() {
  return { score: 0, questionIndex: 0, answers: [] };
}

let state = createInitialState();

function getGameState() {
  return { ...state, answers: [...state.answers] };
}

function resetGameState() {
  state = createInitialState();
  return getGameState();
}

function recordAnswer(isCorrect) {
  state.answers.push({ correct: !!isCorrect });
  if (isCorrect) state.score += 1;
  state.questionIndex += 1;
  return getGameState();
}

module.exports = { getGameState, resetGameState, recordAnswer };
