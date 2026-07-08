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
 */

const QUESTIONS_PER_GAME = 10;

function createInitialGameState() {
  return { score: 0, questionIndex: 0, answers: [] };
}

/** Samples `count` questions without replacement, so none repeats within a game. */
function selectGameQuestions(questions, count, randomFn) {
  if (!Array.isArray(questions)) {
    throw new Error('questions must be an array');
  }

  const sampleSize = count === undefined ? QUESTIONS_PER_GAME : count;
  const random = randomFn || Math.random;

  const pool = questions.slice();
  const selected = [];

  while (selected.length < sampleSize && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const safeIndex = Math.min(Math.max(index, 0), pool.length - 1);
    selected.push(pool.splice(safeIndex, 1)[0]);
  }

  return selected;
}

function startNewGame(questions, options = {}) {
  return {
    state: createInitialGameState(),
    questions: selectGameQuestions(questions, options.count, options.randomFn),
  };
}

module.exports = {
  QUESTIONS_PER_GAME,
  createInitialGameState,
  selectGameQuestions,
  startNewGame,
};
