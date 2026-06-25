/**
 * Metric definitions and helpers for computed product metrics.
 *
 * The key metric required by TRIOFSND-41 is the replay rate within 5 minutes:
 * the percentage of game completions that are followed by a replay click in
 * under 5 minutes (300 seconds).
 */

export const METRIC_NAMES = Object.freeze({
  REPLAY_RATE_UNDER_5MIN: 'replay_rate_under_5min',
  SESSION_DURATION: 'session_duration',
  COMPLETION_RATE: 'completion_rate',
});

/**
 * Threshold (in milliseconds) for the replay-rate-within-5-minutes metric.
 */
export const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 300_000 ms

/**
 * Compute whether a replay click happened within the 5-minute window
 * after a game completion.
 *
 * @param {number} gameCompletedTimestamp - epoch ms of the game_completed event
 * @param {number} replayClickedTimestamp - epoch ms of the replay_clicked event
 * @returns {{ withinWindow: boolean, deltaMs: number } | null}
 */
export function computeReplayDelta(gameCompletedTimestamp, replayClickedTimestamp) {
  if (
    typeof gameCompletedTimestamp !== 'number' ||
    typeof replayClickedTimestamp !== 'number' ||
    Number.isNaN(gameCompletedTimestamp) ||
    Number.isNaN(replayClickedTimestamp)
  ) {
    return null;
  }

  const deltaMs = replayClickedTimestamp - gameCompletedTimestamp;
  if (deltaMs < 0) {
    // Replay clicked before game completed — invalid / clock skew; ignore.
    return null;
  }

  return {
    deltaMs,
    withinWindow: deltaMs < REPLAY_WINDOW_MS,
  };
}

/**
 * Build the replay_rate_under_5min metric payload.
 *
 * @param {{ withinWindow: boolean, deltaMs: number }} delta
 * @returns {{ metric: string, value: boolean, delta_ms: number }}
 */
export function buildReplayRateMetric(delta) {
  return {
    metric: METRIC_NAMES.REPLAY_RATE_UNDER_5MIN,
    value: delta.withinWindow,
    delta_ms: delta.deltaMs,
  };
}
