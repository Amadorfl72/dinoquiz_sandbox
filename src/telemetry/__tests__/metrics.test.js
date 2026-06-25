import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordGameOver,
  computeReplayRateUnder5Min,
  resetReplayRateTracking,
  FIVE_MINUTES_MS,
} from '../metrics.js';

describe('replay rate metrics', () => {
  beforeEach(() => {
    resetReplayRateTracking();
  });

  it('returns null when no game_over recorded', () => {
    const result = computeReplayRateUnder5Min(1000000);
    expect(result).toBeNull();
  });

  it('returns value=true when delta < 5 min', () => {
    recordGameOver(1000000);
    const result = computeReplayRateUnder5Min(1000000 + 60000);
    expect(result).toEqual({
      metric: 'replay_rate_under_5min',
      value: true,
      delta_ms: 60000,
    });
  });

  it('returns value=false when delta >= 5 min', () => {
    recordGameOver(1000000);
    const result = computeReplayRateUnder5Min(1000000 + FIVE_MINUTES_MS);
    expect(result).toEqual({
      metric: 'replay_rate_under_5min',
      value: false,
      delta_ms: FIVE_MINUTES_MS,
    });
  });

  it('returns value=false for exactly 5 min boundary (not < 5 min)', () => {
    recordGameOver(1000000);
    const result = computeReplayRateUnder5Min(1000000 + FIVE_MINUTES_MS);
    expect(result.value).toBe(false);
  });

  it('handles negative delta (clock skew) gracefully', () => {
    recordGameOver(2000000);
    const result = computeReplayRateUnder5Min(1000000);
    expect(result).toEqual({
      metric: 'replay_rate_under_5min',
      value: false,
      delta_ms: null,
    });
  });

  it('reset clears the stored timestamp', () => {
    recordGameOver(1000000);
    resetReplayRateTracking();
    expect(computeReplayRateUnder5Min(2000000)).toBeNull();
  });
});
