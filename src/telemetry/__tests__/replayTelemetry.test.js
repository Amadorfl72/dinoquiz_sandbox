import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from 'vitest';

import {
  handleReplayClick,
  handleReplayGameStart,
  handleGameOver,
} from '../replayTelemetry.js';
import { trackEvent, trackMetric } from '../transport.js';
import {
  recordGameOver,
  computeReplayRateUnder5Min,
  resetReplayRateTracking,
} from '../metrics.js';

vi.mock('../transport.js', () => ({
  trackEvent: vi.fn(),
  trackMetric: vi.fn(),
}));

describe('replayTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetReplayRateTracking();
  });

  describe('handleReplayClick', () => {
    it('emits replay_clicked with previous_score and timestamp', () => {
      handleReplayClick(7, { timestamp: 1000000 });

      expect(trackEvent).toHaveBeenCalledWith({
        event: 'replay_clicked',
        previous_score: 7,
        timestamp: 1000000,
      });
    });

    it('defaults previous_score to 0 if invalid', () => {
      handleReplayClick(undefined, { timestamp: 1000000 });

      expect(trackEvent).toHaveBeenCalledWith({
        event: 'replay_clicked',
        previous_score: 0,
        timestamp: 1000000,
      });
    });

    it('emits replay_rate_under_5min metric when delta < 5 min', () => {
      recordGameOver(1000000); // game over at t=1000000
      handleReplayClick(5, { timestamp: 1000000 + 120000 }); // replay 2 min later

      expect(trackMetric).toHaveBeenCalledWith({
        metric: 'replay_rate_under_5min',
        value: true,
        delta_ms: 120000,
      });
    });

    it('emits replay_rate_under_5min=false when delta >= 5 min', () => {
      recordGameOver(1000000);
      handleReplayClick(5, { timestamp: 1000000 + 400000 }); // 6.6 min later

      expect(trackMetric).toHaveBeenCalledWith({
        metric: 'replay_rate_under_5min',
        value: false,
        delta_ms: 400000,
      });
    });

    it('does not emit metric if no prior game_over', () => {
      handleReplayClick(5, { timestamp: 1000000 });

      expect(trackMetric).not.toHaveBeenCalled();
    });

    it('does not throw if transport fails', () => {
      trackEvent.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      expect(() => handleReplayClick(5)).not.toThrow();
    });
  });

  describe('handleReplayGameStart', () => {
    it('emits game_started with trigger replay', () => {
      handleReplayGameStart();

      expect(trackEvent).toHaveBeenCalledWith({
        event: 'game_started',
        trigger: 'replay',
      });
    });

    it('resets replay rate tracking after emitting', () => {
      recordGameOver(1000000);
      handleReplayGameStart();

      // After reset, a subsequent replay click should not emit a metric.
      trackMetric.mockClear();
      handleReplayClick(5, { timestamp: 2000000 });
      expect(trackMetric).not.toHaveBeenCalled();
    });

    it('does not throw if transport fails', () => {
      trackEvent.mockImplementationOnce(() => {
        throw new Error('Network error');
      });

      expect(() => handleReplayGameStart()).not.toThrow();
    });
  });

  describe('handleGameOver', () => {
    it('records game over timestamp without throwing', () => {
      expect(() => handleGameOver()).not.toThrow();
    });
  });
});
