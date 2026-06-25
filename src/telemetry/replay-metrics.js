/**
 * Replay telemetry and replay-rate metric calculation.
 *
 * Responsibilities:
 *   1. Emit 'replay_clicked' with previous_score and timestamp when the user
 *      taps 'Volver a jugar' on the results screen.
 *   2. Emit 'game_started' with trigger:'replay' when a new game starts
 *      because the user clicked replay (vs. trigger:'initial').
 *   3. Calculate and emit the 'replay_rate' metric: the percentage of
 *      completed games that are followed by a replay within 5 minutes.
 *
 * All events are anonymous — no PII, no user IDs, no device fingerprints.
 */

import { emit } from './telemetry.js';

/**
 * Window (in milliseconds) within which a replay after game completion
 * counts toward the replay-rate metric.
 */
export const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Event names used by this module.
 */
export const EVENTS = {
  REPLAY_CLICKED: 'replay_clicked',
  GAME_STARTED: 'game_started',
  GAME_COMPLETED: 'game_completed',
  REPLAY_RATE: 'replay_rate',
};

/**
 * Internal state for replay-rate calculation.
 * We track the timestamp of the most recent game completion.
 * If a replay-clicked event arrives within REPLAY_WINDOW_MS, it counts.
 *
 * @typedef {Object} ReplayState
 * @property {number|null} lastGameCompletedAt - Epoch ms of last completion.
 * @property {number} totalCompletions - Count of completed games.
 * @property {number} replaysWithinWindow - Count of replays within 5 min.
 */

/**
 * @type {ReplayState}
 */
const state = {
  lastGameCompletedAt: null,
  totalCompletions: 0,
  replaysWithinWindow: 0,
};

/**
 * Reset internal replay-metric state (mainly for tests).
 * @returns {void}
 */
export function resetReplayState() {
  state.lastGameCompletedAt = null;
  state.totalCompletions = 0;
  state.replaysWithinWindow = 0;
}

/**
 * Record that a game was completed.
 *
 * Emits a 'game_completed' event with the final score and updates
 * internal state for replay-rate calculation.
 *
 * @param {Object} params
 * @param {number} params.score - Final score (0-10).
 * @param {number} [params.timestamp] - Epoch ms (defaults to Date.now()).
 * @returns {Object} The emitted event.
 */
export function recordGameCompleted({ score, timestamp = Date.now() }) {
  state.lastGameCompletedAt = timestamp;
  state.totalCompletions += 1;

  return emit(EVENTS.GAME_COMPLETED, {
    score,
    timestamp: new Date(timestamp).toISOString(),
  });
}

/**
 * Record that the user clicked 'Volver a jugar' on the results screen.
 *
 * Emits a 'replay_clicked' event with previous_score and timestamp.
 * Also checks whether this replay falls within the 5-minute window after
 * the last game completion and, if so, increments the replay counter and
 * emits the current replay_rate metric.
 *
 * @param {Object} params
 * @param {number} params.previousScore - Score of the just-completed game.
 * @param {number} [params.timestamp] - Epoch ms (defaults to Date.now()).
 * @returns {Object} The emitted 'replay_clicked' event.
 */
export function recordReplayClicked({ previousScore, timestamp = Date.now() }) {
  const event = emit(EVENTS.REPLAY_CLICKED, {
    previous_score: previousScore,
    timestamp: new Date(timestamp).toISOString(),
  });

  // Check if this replay is within the 5-minute window after completion.
  if (
    state.lastGameCompletedAt !== null &&
    timestamp - state.lastGameCompletedAt <= REPLAY_WINDOW_MS
  ) {
    state.replaysWithinWindow += 1;
    emitReplayRate();
  }

  return event;
}

/**
 * Record that a new game has started.
 *
 * Emits a 'game_started' event. When trigger is 'replay', it indicates
 * the game was started from the 'Volver a jugar' button.
 *
 * @param {Object} params
 * @param {'initial'|'replay'} params.trigger - What caused the game to start.
 * @param {number} [params.timestamp] - Epoch ms (defaults to Date.now()).
 * @returns {Object} The emitted event.
 */
export function recordGameStarted({ trigger, timestamp = Date.now() }) {
  return emit(EVENTS.GAME_STARTED, {
    trigger,
    timestamp: new Date(timestamp).toISOString(),
  });
}

/**
 * Calculate the current replay rate.
 *
 * replay_rate = replaysWithinWindow / totalCompletions * 100
 *
 * @returns {number} Replay rate as a percentage (0-100). Returns 0 if no completions.
 */
export function calculateReplayRate() {
  if (state.totalCompletions === 0) {
    return 0;
  }
  return (state.replaysWithinWindow / state.totalCompletions) * 100;
}

/**
 * Emit the current replay_rate metric as a structured event.
 *
 * @returns {Object} The emitted event.
 */
export function emitReplayRate() {
  return emit(EVENTS.REPLAY_RATE, {
    replay_rate: Number(calculateReplayRate().toFixed(2)),
    total_completions: state.totalCompletions,
    replays_within_window: state.replaysWithinWindow,
    window_ms: REPLAY_WINDOW_MS,
  });
}

/**
 * Get a snapshot of the internal replay state (for debugging/tests).
 *
 * @returns {ReplayState} A shallow copy of the state.
 */
export function getReplayState() {
  return { ...state };
}
