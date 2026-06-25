/**
 * Replay telemetry orchestrator.
 *
 * Coordinates the emission of 'replay_clicked' and 'game_started' (trigger:'replay')
 * events, as well as the 'replay_rate_under_5min' metric.
 *
 * All operations are wrapped in try/catch so that telemetry failures never
 * affect the user experience (per PRD: no blocking errors for children).
 */

import {
  buildReplayClickedEvent,
  buildGameStartedEvent,
} from './events.js';
import {
  recordGameOver,
  computeReplayRateUnder5Min,
  resetReplayRateTracking,
} from './metrics.js';
import { trackEvent, trackMetric } from './transport.js';

/**
 * Called when the user clicks 'Volver a jugar'.
 *
 * Emits:
 *   1. 'replay_clicked' with previous_score and timestamp.
 *   2. 'replay_rate_under_5min' metric (computed from last game_over).
 *
 * @param {number} previousScore - Score of the just-completed game.
 * @param {object} [opts] - Internal/testing overrides.
 * @param {number} [opts.timestamp] - Override replay_clicked timestamp.
 */
export function handleReplayClick(previousScore, opts = {}) {
  try {
    const timestamp = opts.timestamp ?? Date.now();

    // 1. Emit 'replay_clicked' with previous_score and timestamp.
    const replayEvent = buildReplayClickedEvent(previousScore, timestamp);
    trackEvent(replayEvent);

    // 2. Compute and emit replay_rate_under_5min metric.
    const replayMetric = computeReplayRateUnder5Min(timestamp);
    if (replayMetric) {
      trackMetric(replayMetric);
    }
  } catch {
    // Swallow - telemetry must never break gameplay.
  }
}

/**
 * Called when a new game starts as a result of a replay.
 *
 * Emits 'game_started' with trigger: 'replay'.
 * Also resets the replay-rate tracking so the next cycle starts fresh.
 */
export function handleReplayGameStart() {
  try {
    const gameStartedEvent = buildGameStartedEvent('replay');
    trackEvent(gameStartedEvent);
    resetReplayRateTracking();
  } catch {
    // Swallow - telemetry must never break gameplay.
  }
}

/**
 * Called when a game completes (game over).
 * Records the timestamp so the replay-rate metric can be computed later.
 */
export function handleGameOver() {
  try {
    recordGameOver();
  } catch {
    // Swallow.
  }
}

// Re-export for convenience.
export { recordGameOver, computeReplayRateUnder5Min, resetReplayRateTracking };
