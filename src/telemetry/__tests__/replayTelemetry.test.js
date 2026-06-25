/**
 * Unit tests for replay telemetry (TRIOFSND-41).
 */

import {
  recordGameCompleted,
  recordReplayClicked,
  recordGameStartedReplay,
  recordGameStartedInitial,
  _resetReplayTelemetryState,
  _getReplayTelemetryState,
} from '../replayTelemetry.js';
import { telemetry } from '../telemetry.js';
import { EVENT_NAMES, GAME_START_TRIGGERS } from '../events.js';
import { METRIC_NAMES, REPLAY_WINDOW_MS } from '../metrics.js';

describe('replayTelemetry', () => {
  beforeEach(() => {
    _resetReplayTelemetryState();
    telemetry._buffer = [];
  });

  describe('recordReplayClicked', () => {
    it('emits replay_clicked with previous_score and timestamp', () => {
      const ts = Date.now();
      recordReplayClicked(7, ts);

      const events = telemetry.getBuffer();
      const replayEvent = events.find((e) => e.event === EVENT_NAMES.REPLAY_CLICKED);

      expect(replayEvent).toBeDefined();
      expect(replayEvent.previous_score).toBe(7);
      expect(replayEvent.timestamp).toBe(ts);
    });

    it('emits replay_rate_under_5min metric when delta < 5 min', () => {
      const completedAt = Date.now();
      recordGameCompleted(8, completedAt);

      // Replay 2 minutes later
      const replayAt = completedAt + 2 * 60 * 1000;
      recordReplayClicked(8, replayAt);

      const events = telemetry.getBuffer();
      const metric = events.find((e) => e.event === 'metric' && e.metric === METRIC_NAMES.REPLAY_RATE_UNDER_5MIN);

      expect(metric).toBeDefined();
      expect(metric.value).toBe(true);
      expect(metric.delta_ms).toBe(2 * 60 * 1000);
    });

    it('emits replay_rate_under_5min=false when delta >= 5 min', () => {
      const completedAt = Date.now();
      recordGameCompleted(5, completedAt);

      // Replay 6 minutes later
      const replayAt = completedAt + 6 * 60 * 1000;
      recordReplayClicked(5, replayAt);

      const events = telemetry.getBuffer();
      const metric = events.find((e) => e.event === 'metric' && e.metric === METRIC_NAMES.REPLAY_RATE_UNDER_5MIN);

      expect(metric).toBeDefined();
      expect(metric.value).toBe(false);
    });

    it('does not emit metric when no prior game_completed', () => {
      recordReplayClicked(3, Date.now());

      const events = telemetry.getBuffer();
      const metric = events.find((e) => e.event === 'metric' && e.metric === METRIC_NAMES.REPLAY_RATE_UNDER_5MIN);

      expect(metric).toBeUndefined();
    });

    it('does not throw on telemetry failure', () => {
      expect(() => recordReplayClicked(null, null)).not.toThrow();
    });
  });

  describe('recordGameStarted', () => {
    it('emits game_started with trigger replay', () => {
      recordGameStartedReplay();

      const events = telemetry.getBuffer();
      const started = events.find((e) => e.event === EVENT_NAMES.GAME_STARTED);

      expect(started).toBeDefined();
      expect(started.trigger).toBe(GAME_START_TRIGGERS.REPLAY);
    });

    it('emits game_started with trigger initial', () => {
      recordGameStartedInitial();

      const events = telemetry.getBuffer();
      const started = events.find((e) => e.event === EVENT_NAMES.GAME_STARTED);

      expect(started).toBeDefined();
      expect(started.trigger).toBe(GAME_START_TRIGGERS.INITIAL);
    });
  });

  describe('REPLAY_WINDOW_MS', () => {
    it('is 5 minutes', () => {
      expect(REPLAY_WINDOW_MS).toBe(5 * 60 * 1000);
    });
  });
});
