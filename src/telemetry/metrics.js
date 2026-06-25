/**
 * Replay-rate metric calculation.
 *
 * The replay rate is defined as the percentage of game completions that are
 * followed by a 'replay_clicked' within 5 minutes (300 seconds).
 *
 * Flow:
 *   1. When a game completes, we record game_over_timestamp.
 *   2. When the user clicks 'Volver a jugar', we record replay_clicked_timestamp.
 *   3. The delta between game_over and replay_clicked is computed.
 *   4. If delta < 300_000 ms, we emit 'replay_rate_under_5min' = true.
 *      Otherwise we emit it = false (still a replay, just not within 5 min).
 */

const FIVE_MINUTES_MS = 5 * 60 * 1000; // 300_000

/**
 * In-memory store for the last game-over timestamp.
 * In a real app this could be persisted to localStorage, but since the PRD
 * says partial games are discarded on reopen, in-memory is sufficient.
 */
let lastGameOverTimestamp = null;

/**
 * Record that a game has just completed (game_over).
 * Called from GameController when the game finishes.
 * @param {number} [timestamp] - Override for testing.
 */
export function recordGameOver(timestamp = Date.now()) {
  try {
    lastGameOverTimestamp = timestamp;
  } catch {
    // Swallow - telemetry must never break gameplay.
    lastGameOverTimestamp = null;
  }
}

/**
 * Compute the replay rate metric based on the delta between the last
 * game_over and the current replay_clicked timestamp.
 *
 * @param {number} replayClickedTimestamp - Timestamp of the replay click.
 * @returns {{metric: string, value: boolean, delta_ms: number|null} | null}
 *   Returns null if there was no prior game_over (e.g. first-ever replay
 *   without a completed game, which shouldn't happen but is handled gracefully).
 */
export function computeReplayRateUnder5Min(replayClickedTimestamp = Date.now()) {
  try {
    if (lastGameOverTimestamp === null || typeof lastGameOverTimestamp !== 'number') {
      return null;
    }

    const deltaMs = replayClickedTimestamp - lastGameOverTimestamp;

    // Guard against negative deltas (clock skew or out-of-order events).
    if (deltaMs < 0) {
      return {
        metric: 'replay_rate_under_5min',
        value: false,
        delta_ms: null,
      };
    }

    return {
      metric: 'replay_rate_under_5min',
      value: deltaMs < FIVE_MINUTES_MS,
      delta_ms: deltaMs,
    };
  } catch {
    return null;
  }
}

/**
 * Reset the stored game-over timestamp (e.g. when a new game starts).
 */
export function resetReplayRateTracking() {
  lastGameOverTimestamp = null;
}

export { FIVE_MINUTES_MS };
