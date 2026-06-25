/**
 * Replay-specific telemetry orchestration.
 *
 * Responsibilities (TRIOFSND-41):
 *  1. Emit `replay_clicked` with `previous_score` and `timestamp` when the
 *     user taps "Volver a jugar".
 *  2. Emit `game_started` with `trigger: 'replay'` when a new game starts
 *     as a result of a replay click.
 *  3. Calculate and emit the `replay_rate_under_5min` metric by measuring
 *     the delta between `game_completed` and the subsequent `replay_clicked`.
 *
 * All public functions are wrapped in try/catch so telemetry failures never
 * affect the child's experience.
 */

import { telemetry } from './telemetry.js';
import { EVENT_NAMES, GAME_START_TRIGGERS } from './events.js';
import {
  METRIC_NAMES,
  computeReplayDelta,
  buildReplayRateMetric,
} from './metrics.js';

/**
 * Internal state for replay metric computation.
 * We store the timestamp of the last game_completed so that when a
 * replay_clicked arrives we can compute the delta.
 */
const replayState = {
  lastGameCompletedTimestamp: null,
  lastGameCompletedScore: null,
  lastReplayClickedTimestamp: null,
};

/**
 * Called when a game completes. Stores the completion timestamp so the
 * replay-rate metric can be computed later.
 *
 * @param {number} score - final score (0-10)
 * @param {number} [timestamp=Date.now()]
 */
export function recordGameCompleted(score, timestamp = Date.now()) {
  try {
    replayState.lastGameCompletedTimestamp = timestamp;
    replayState.lastGameCompletedScore = score;

    telemetry.trackEvent(EVENT_NAMES.GAME_COMPLETED, {
      score,
      timestamp,
    });
  } catch (err) {
    console.error('[replayTelemetry] recordGameCompleted failed:', err);
  }
}

/**
 * Called when the user clicks "Volver a jugar".
 *
 * Emits the `replay_clicked` event with `previous_score` and `timestamp`,
 * and computes the `replay_rate_under_5min` metric using the delta from
 * the last `game_completed`.
 *
 * @param {number} previousScore - the score of the just-completed game
 * @param {number} [timestamp=Date.now()]
 */
export function recordReplayClicked(previousScore, timestamp = Date.now()) {
  try {
    // Emit the structured event with required fields.
    telemetry.trackEvent(EVENT_NAMES.REPLAY_CLICKED, {
      previous_score: previousScore,
      timestamp,
    });

    replayState.lastReplayClickedTimestamp = timestamp;

    // Compute and emit the replay_rate_under_5min metric.
    if (replayState.lastGameCompletedTimestamp !== null) {
      const delta = computeReplayDelta(
        replayState.lastGameCompletedTimestamp,
        timestamp
      );

      if (delta) {
        const metricPayload = buildReplayRateMetric(delta);
        telemetry.trackMetric(
          METRIC_NAMES.REPLAY_RATE_UNDER_5MIN,
          delta.withinWindow,
          {
            delta_ms: delta.deltaMs,
            previous_score: previousScore,
          }
        );

        // Also expose the metric payload for callers that want it.
        return metricPayload;
      }
    }
  } catch (err) {
    console.error('[replayTelemetry] recordReplayClicked failed:', err);
  }

  return null;
}

/**
 * Called when a new game starts. If this start is a replay (i.e. it follows
 * a replay_clicked), emit `game_started` with `trigger: 'replay'`.
 *
 * @param {string} trigger - one of GAME_START_TRIGGERS
 * @param {number} [timestamp=Date.now()]
 */
export function recordGameStarted(trigger, timestamp = Date.now()) {
  try {
    telemetry.trackEvent(EVENT_NAMES.GAME_STARTED, {
      trigger,
      timestamp,
    });
  } catch (err) {
    console.error('[replayTelemetry] recordGameStarted failed:', err);
  }
}

/**
 * Convenience: emit game_started with trigger 'replay'.
 */
export function recordGameStartedReplay(timestamp = Date.now()) {
  recordGameStarted(GAME_START_TRIGGERS.REPLAY, timestamp);
}

/**
 * Convenience: emit game_started with trigger 'initial'.
 */
export function recordGameStartedInitial(timestamp = Date.now()) {
  recordGameStarted(GAME_START_TRIGGERS.INITIAL, timestamp);
}

/**
 * Reset internal state. Useful for tests.
 */
export function _resetReplayTelemetryState() {
  replayState.lastGameCompletedTimestamp = null;
  replayState.lastGameCompletedScore = null;
  replayState.lastReplayClickedTimestamp = null;
}

/**
 * Expose internal state for testing / inspection.
 */
export function _getReplayTelemetryState() {
  return { ...replayState };
}
