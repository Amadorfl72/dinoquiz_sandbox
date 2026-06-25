import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from 'vitest';

import {
  recordGameCompleted,
  recordReplayClicked,
  recordGameStarted,
  calculateReplayRate,
  emitReplayRate,
  getReplayState,
  resetReplayState,
  REPLAY_WINDOW_MS,
  EVENTS,
} from '../replay-metrics.js';
import {
  eventBuffer,
  resetEventBuffer,
  configureTelemetry,
} from '../telemetry.js';

describe('replay-metrics', () => {
  beforeEach(() => {
    resetEventBuffer();
    resetReplayState();
    configureTelemetry({}); // reset to default transport
  });

  describe('recordGameStarted', () => {
    it('emits game_started with trigger initial', () => {
      const event = recordGameStarted({ trigger: 'initial' });

      expect(event.event).toBe(EVENTS.GAME_STARTED);
      expect(event.trigger).toBe('initial');
      expect(event.timestamp).toBeDefined();
      expect(event.app_version).toBeDefined();
      expect(event.locale).toBe('es-ES');
    });

    it('emits game_started with trigger replay', () => {
      const event = recordGameStarted({ trigger: 'replay' });

      expect(event.event).toBe(EVENTS.GAME_STARTED);
      expect(event.trigger).toBe('replay');
    });

    it('accepts a custom timestamp', () => {
      const ts = new Date('2024-01-15T10:00:00Z').getTime();
      const event = recordGameStarted({ trigger: 'replay', timestamp: ts });

      expect(event.timestamp).toBe('2024-01-15T10:00:00.000Z');
    });
  });

  describe('recordGameCompleted', () => {
    it('emits game_completed with score', () => {
      const event = recordGameCompleted({ score: 7 });

      expect(event.event).toBe(EVENTS.GAME_COMPLETED);
      expect(event.score).toBe(7);
      expect(event.timestamp).toBeDefined();
    });

    it('increments totalCompletions', () => {
      recordGameCompleted({ score: 5 });
      recordGameCompleted({ score: 8 });

      expect(getReplayState().totalCompletions).toBe(2);
    });

    it('records lastGameCompletedAt', () => {
      const ts = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: ts });

      expect(getReplayState().lastGameCompletedAt).toBe(ts);
    });
  });

  describe('recordReplayClicked', () => {
    it('emits replay_clicked with previous_score and timestamp', () => {
      const event = recordReplayClicked({ previousScore: 6 });

      expect(event.event).toBe(EVENTS.REPLAY_CLICKED);
      expect(event.previous_score).toBe(6);
      expect(event.timestamp).toBeDefined();
    });

    it('counts as replay within window when clicked <5min after completion', () => {
      const completedAt = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: completedAt });

      // 2 minutes later
      recordReplayClicked({ previousScore: 5, timestamp: completedAt + 120_000 });

      const state = getReplayState();
      expect(state.replaysWithinWindow).toBe(1);
    });

    it('does NOT count as replay when clicked >5min after completion', () => {
      const completedAt = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: completedAt });

      // 6 minutes later — outside window
      recordReplayClicked({
        previousScore: 5,
        timestamp: completedAt + REPLAY_WINDOW_MS + 60_000,
      });

      expect(getReplayState().replaysWithinWindow).toBe(0);
    });

    it('counts replay exactly at the 5-minute boundary', () => {
      const completedAt = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: completedAt });

      recordReplayClicked({
        previousScore: 5,
        timestamp: completedAt + REPLAY_WINDOW_MS,
      });

      expect(getReplayState().replaysWithinWindow).toBe(1);
    });

    it('does not count replay when no game was completed yet', () => {
      recordReplayClicked({ previousScore: 0 });

      expect(getReplayState().replaysWithinWindow).toBe(0);
    });

    it('emits replay_rate event when replay is within window', () => {
      const completedAt = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: completedAt });
      recordReplayClicked({ previousScore: 5, timestamp: completedAt + 60_000 });

      const rateEvents = eventBuffer.filter(
        (e) => e.event === EVENTS.REPLAY_RATE,
      );
      expect(rateEvents).toHaveLength(1);
      expect(rateEvents[0].replay_rate).toBe(100);
      expect(rateEvents[0].total_completions).toBe(1);
      expect(rateEvents[0].replays_within_window).toBe(1);
    });

    it('does NOT emit replay_rate when replay is outside window', () => {
      const completedAt = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: completedAt });
      recordReplayClicked({
        previousScore: 5,
        timestamp: completedAt + REPLAY_WINDOW_MS + 1,
      });

      const rateEvents = eventBuffer.filter(
        (e) => e.event === EVENTS.REPLAY_RATE,
      );
      expect(rateEvents).toHaveLength(0);
    });
  });

  describe('calculateReplayRate', () => {
    it('returns 0 when no completions', () => {
      expect(calculateReplayRate()).toBe(0);
    });

    it('returns 100 when all completions have replays within window', () => {
      const base = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: base });
      recordReplayClicked({ previousScore: 5, timestamp: base + 60_000 });

      recordGameCompleted({ score: 7, timestamp: base + 300_000 });
      recordReplayClicked({ previousScore: 7, timestamp: base + 360_000 });

      expect(calculateReplayRate()).toBe(100);
    });

    it('returns 50 when half of completions have replays within window', () => {
      const base = 1700000000000;

      // Game 1: replayed within window
      recordGameCompleted({ score: 5, timestamp: base });
      recordReplayClicked({ previousScore: 5, timestamp: base + 60_000 });

      // Game 2: NOT replayed within window (replay too late)
      recordGameCompleted({ score: 7, timestamp: base + 400_000 });
      recordReplayClicked({
        previousScore: 7,
        timestamp: base + 400_000 + REPLAY_WINDOW_MS + 10_000,
      });

      expect(calculateReplayRate()).toBe(50);
    });
  });

  describe('emitReplayRate', () => {
    it('emits a replay_rate event with current values', () => {
      const base = 1700000000000;
      recordGameCompleted({ score: 5, timestamp: base });
      recordReplayClicked({ previousScore: 5, timestamp: base + 60_000 });

      resetEventBuffer(); // clear previous events but keep state
      const event = emitReplayRate();

      expect(event.event).toBe(EVENTS.REPLAY_RATE);
      expect(event.replay_rate).toBe(100);
      expect(event.total_completions).toBe(1);
      expect(event.replays_within_window).toBe(1);
      expect(event.window_ms).toBe(REPLAY_WINDOW_MS);
    });
  });

  describe('integration: full replay flow', () => {
    it('emits all expected events in correct order for a replay session', () => {
      const base = 1700000000000;

      // 1. Initial game start
      recordGameStarted({ trigger: 'initial', timestamp: base });

      // 2. Game completed
      recordGameCompleted({ score: 6, timestamp: base + 180_000 });

      // 3. User clicks 'Volver a jugar' 1 minute later
      recordReplayClicked({ previousScore: 6, timestamp: base + 240_000 });

      // 4. New game starts from replay
      recordGameStarted({ trigger: 'replay', timestamp: base + 241_000 });

      const eventNames = eventBuffer.map((e) => e.event);
      expect(eventNames).toEqual([
        EVENTS.GAME_STARTED,
        EVENTS.GAME_COMPLETED,
        EVENTS.REPLAY_CLICKED,
        EVENTS.REPLAY_RATE,
        EVENTS.GAME_STARTED,
      ]);

      // Verify the replay game_started has trigger 'replay'
      const lastStarted = eventBuffer[4];
      expect(lastStarted.trigger).toBe('replay');

      // Verify replay_clicked has previous_score
      const replayEvent = eventBuffer[2];
      expect(replayEvent.previous_score).toBe(6);
    });
  });

  describe('privacy compliance', () => {
    it('never includes PII fields in events', () => {
      recordGameStarted({ trigger: 'initial' });
      recordGameCompleted({ score: 5 });
      recordReplayClicked({ previousScore: 5 });

      const forbiddenKeys = [
        'user_id',
        'userId',
        'device_id',
        'deviceId',
        'ip',
        'email',
        'name',
        'cookie',
      ];

      for (const event of eventBuffer) {
        for (const key of forbiddenKeys) {
          expect(event).not.toHaveProperty(key);
        }
      }
    });
  });
});
