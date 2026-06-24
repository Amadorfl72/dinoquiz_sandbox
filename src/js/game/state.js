/**
 * Game state module.
 * Centralises all mutable game state and provides reset/transition helpers.
 */

export const GameState = {
  /** @type {Array<object>} selected questions for the current game */
  questions: [],
  /** @type {number} zero-based index of the current question */
  currentIndex: 0,
  /** @type {number} correct answers so far */
  score: 0,
  /** @type {boolean} whether a game is in progress */
  inProgress: false,
  /** @type {number} timestamp when the current game started (ms) */
  startedAt: 0,
};

/**
 * Resets all game state to initial values.
 * Called before starting a new game (both first play and replay).
 */
export function resetGameState() {
  GameState.questions = [];
  GameState.currentIndex = 0;
  GameState.score = 0;
  GameState.inProgress = false;
  GameState.startedAt = 0;
}

/**
 * Marks the game as started and records the start timestamp.
 */
export function markGameStarted() {
  GameState.inProgress = true;
  GameState.startedAt = performance.now();
}

/**
 * Advances to the next question. Returns false if the game is over.
 * @returns {boolean}
 */
export function advanceQuestion() {
  GameState.currentIndex += 1;
  return GameState.currentIndex < GameState.questions.length;
}

/**
 * Increments the score by one.
 */
export function incrementScore() {
  GameState.score += 1;
}

/**
 * Returns the current question object or null.
 * @returns {object|null}
 */
export function getCurrentQuestion() {
  if (GameState.currentIndex < 0 || GameState.currentIndex >= GameState.questions.length) {
    return null;
  }
  return GameState.questions[GameState.currentIndex];
}
