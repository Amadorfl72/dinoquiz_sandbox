import {
  initTelemetry,
  emitReplayClicked,
  emitGameStarted,
  _resetTelemetry,
  _getBuffer,
  _getLastReplayClickedTs,
  TelemetryTransport,
} from '../replayTelemetry';

describe('replayTelemetry', () => {
  let sentEvents: any[];
  let mockTransport: TelemetryTransport;
  let currentTime: number;

  beforeEach(() => {
    _resetTelemetry();
    sentEvents = [];
    currentTime = 1700000000000; // fixed epoch
    mockTransport = async (events) => {
      sentEvents.push(...events);
    };
    initTelemetry({
      appVersion: '1.0.0',
      locale: 'es-ES',
      transport: mockTransport,
      now: () => currentTime,
    });
  });

  afterEach(() => {
    _resetTelemetry();
  });

  describe('emitReplayClicked', () => {
    it('emits a replay_clicked event with previous_score and timestamp', async () => {
      emitReplayClicked(7);
      await flushMicrotasks();

      expect(sentEvents).toHaveLength(1);
      expect(sentEvents[0].event).toBe('replay_clicked');
      expect(sentEvents[0].previous_score).toBe(7);
      expect(sentEvents[0].timestamp).toBeDefined();
      expect(sentEvents[0].app_version).toBe('1.0.0');
      expect(sentEvents[0].locale).toBe('es-ES');
    });

    it('stores the replay_clicked timestamp for delta calculation', () => {
      emitReplayClicked(5);
      expect(_getLastReplayClickedTs()).toBe(currentTime);
    });

    it('rejects invalid previous_score values', async () => {
      emitReplayClicked(-1 as any);
      emitReplayClicked(11 as any);
      emitReplayClicked('bad' as any);
      await flushMicrotasks();

      expect(sentEvents).toHaveLength(0);
    });
  });

  describe('emitGameStarted', () => {
    it('emits game_started with trigger:initial', async () => {
      emitGameStarted('initial');
      await flushMicrotasks();

      expect(sentEvents).toHaveLength(1);
      expect(sentEvents[0].event).toBe('game_started');
      expect(sentEvents[0].trigger).toBe('initial');
    });

    it('emits game_started with trigger:replay (BUG FIX)', async () => {
      emitGameStarted('replay');
      await flushMicrotasks();

      const gameStarted = sentEvents.find(e => e.event === 'game_started');
      expect(gameStarted).toBeDefined();
      expect(gameStarted.trigger).toBe('replay');
    });

    it('emits replay_rate_under_5min metric when trigger is replay', async () => {
      emitReplayClicked(8);
      // Advance time by 2 minutes (within 5 min window)
      currentTime += 2 * 60 * 1000;
      emitGameStarted('replay');
      await flushMicrotasks();

      const metric = sentEvents.find(e => e.event === 'replay_rate_under_5min');
      expect(metric).toBeDefined();
      expect(metric.replay_rate_under_5min).toBe(true);
      expect(metric.delta_ms).toBe(2 * 60 * 1000);
    });

    it('does NOT emit replay_rate metric when trigger is initial', async () => {
      emitGameStarted('initial');
      await flushMicrotasks();

      const metric = sentEvents.find(e => e.event === 'replay_rate_under_5min');
      expect(metric).toBeUndefined();
    });
  });

  describe('replay rate metric', () => {
    it('reports under_5min=true when delta < 5 minutes', async () => {
      emitReplayClicked(6);
      currentTime += 3 * 60 * 1000; // 3 min
      emitGameStarted('replay');
      await flushMicrotasks();

      const metric = sentEvents.find(e => e.event === 'replay_rate_under_5min');
      expect(metric.replay_rate_under_5min).toBe(true);
      expect(metric.delta_ms).toBe(3 * 60 * 1000);
    });

    it('reports under_5min=false when delta >= 5 minutes', async () => {
      emitReplayClicked(6);
      currentTime += 6 * 60 * 1000; // 6 min
      emitGameStarted('replay');
      await flushMicrotasks();

      const metric = sentEvents.find(e => e.event === 'replay_rate_under_5min');
      expect(metric.replay_rate_under_5min).toBe(false);
      expect(metric.delta_ms).toBe(6 * 60 * 1000);
    });

    it('reports delta_ms=null when no preceding replay_clicked', async () => {
      emitGameStarted('replay');
      await flushMicrotasks();

      const metric = sentEvents.find(e => e.event === 'replay_rate_under_5min');
      expect(metric).toBeDefined();
      expect(metric.delta_ms).toBeNull();
      expect(metric.replay_rate_under_5min).toBe(false);
    });

    it('consumes the replay_clicked timestamp after metric emission', async () => {
      emitReplayClicked(5);
      expect(_getLastReplayClickedTs()).not.toBeNull();

      emitGameStarted('replay');
      await flushMicrotasks();

      expect(_getLastReplayClickedTs()).toBeNull();
    });
  });

  describe('error handling', () => {
    it('does not throw when transport fails', async () => {
      const failingTransport: TelemetryTransport = async () => {
        throw new Error('Network error');
      };
      _resetTelemetry();
      initTelemetry({
        appVersion: '1.0.0',
        locale: 'es-ES',
        transport: failingTransport,
        now: () => currentTime,
      });

      expect(() => emitReplayClicked(5)).not.toThrow();
      expect(() => emitGameStarted('replay')).not.toThrow();
    });

    it('does not throw when not initialized', () => {
      _resetTelemetry();
      expect(() => emitReplayClicked(5)).not.toThrow();
      expect(() => emitGameStarted('initial')).not.toThrow();
    });

    it('retries failed sends and drops after max retries', async () => {
      let callCount = 0;
      const flakyTransport: TelemetryTransport = async () => {
        callCount++;
        throw new Error('Persistent failure');
      };
      _resetTelemetry();
      initTelemetry({
        appVersion: '1.0.0',
        locale: 'es-ES',
        transport: flakyTransport,
        now: () => currentTime,
      });

      emitReplayClicked(5);
      // The event should be in the buffer awaiting retry.
      expect(_getBuffer().length).toBeGreaterThan(0);
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('full replay flow', () => {
    it('emits replay_clicked then game_started with trigger:replay and metric', async () => {
      // 1. Game completes, user clicks replay with score 9
      emitReplayClicked(9);
      await flushMicrotasks();

      // 2. 1 minute later, new game starts from replay
      currentTime += 60 * 1000;
      emitGameStarted('replay');
      await flushMicrotasks();

      const events = sentEvents.map(e => e.event);
      expect(events).toContain('replay_clicked');
      expect(events).toContain('game_started');
      expect(events).toContain('replay_rate_under_5min');

      const gameStarted = sentEvents.find(e => e.event === 'game_started');
      expect(gameStarted.trigger).toBe('replay');

      const replayClicked = sentEvents.find(e => e.event === 'replay_clicked');
      expect(replayClicked.previous_score).toBe(9);

      const metric = sentEvents.find(e => e.event === 'replay_rate_under_5min');
      expect(metric.replay_rate_under_5min).toBe(true);
      expect(metric.delta_ms).toBe(60 * 1000);
    });
  });
});

/** Helper to flush pending microtasks/promises. */
function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
