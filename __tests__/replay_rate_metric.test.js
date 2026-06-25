const {
  createTelemetryService,
} = require('../src/telemetry/replayTelemetry');

describe('TRIOFSND-41 - Replay rate metric', () => {
  let clock;
  let emitted;
  let telemetry;

  beforeEach(() => {
    clock = new Date('2024-01-01T10:00:00Z').getTime();
    emitted = [];
    telemetry = createTelemetryService({
      sink: (event) => emitted.push(event),
      now: () => clock,
      metricWindowMs: 5 * 60 * 1000,
    });
  });

  it('computes replay rate as replays / game_starts within the window', () => {
    // 4 game starts, 1 of them triggered by replay
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitReplayClicked({ previousScore: 100 });
    telemetry.emitGameStarted({ trigger: 'replay' });

    telemetry.flushMetrics();

    const metric = emitted.find((e) => e.name === 'replay_rate');
    expect(metric).toBeDefined();
    expect(metric.payload.value).toBeCloseTo(0.25, 5);
    expect(metric.payload.window_ms).toBe(5 * 60 * 1000);
  });

  it('emits replay_rate within 5 minutes of the first event in the window', () => {
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitReplayClicked({ previousScore: 100 });
    telemetry.emitGameStarted({ trigger: 'replay' });

    // Advance clock to just under 5 minutes
    clock += 5 * 60 * 1000 - 1;
    telemetry.maybeFlushMetrics();

    const metric = emitted.find((e) => e.name === 'replay_rate');
    expect(metric).toBeDefined();
  });

  it('does not emit replay_rate before the 5 minute window elapses when no flush is forced', () => {
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitReplayClicked({ previousScore: 100 });
    telemetry.emitGameStarted({ trigger: 'replay' });

    clock += 5 * 60 * 1000 - 1000;
    telemetry.maybeFlushMetrics();

    expect(emitted.some((e) => e.name === 'replay_rate')).toBe(false);
  });

  it('emits replay_rate automatically once the 5 minute window elapses', () => {
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitReplayClicked({ previousScore: 100 });
    telemetry.emitGameStarted({ trigger: 'replay' });

    clock += 5 * 60 * 1000;
    telemetry.maybeFlushMetrics();

    const metric = emitted.find((e) => e.name === 'replay_rate');
    expect(metric).toBeDefined();
    expect(metric.payload.value).toBeCloseTo(0.5, 5);
  });

  it('counts only game_started events with trigger "replay" as replays', () => {
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'resume' });
    telemetry.emitGameStarted({ trigger: 'replay' });
    telemetry.emitGameStarted({ trigger: 'replay' });

    telemetry.flushMetrics();

    const metric = emitted.find((e) => e.name === 'replay_rate');
    expect(metric.payload.value).toBeCloseTo(0.5, 5);
  });

  it('emits replay_rate of 0 when there are game starts but no replays', () => {
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'menu' });

    telemetry.flushMetrics();

    const metric = emitted.find((e) => e.name === 'replay_rate');
    expect(metric.payload.value).toBe(0);
  });

  it('does not emit replay_rate when there are no game starts in the window', () => {
    telemetry.emitReplayClicked({ previousScore: 100 });
    telemetry.flushMetrics();

    expect(emitted.some((e) => e.name === 'replay_rate')).toBe(false);
  });

  it('resets the window after flushing', () => {
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'replay' });
    telemetry.flushMetrics();

    const first = emitted.filter((e) => e.name === 'replay_rate');
    expect(first).toHaveLength(1);

    // New window with different ratio
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.flushMetrics();

    const metrics = emitted.filter((e) => e.name === 'replay_rate');
    expect(metrics).toHaveLength(2);
    expect(metrics[1].payload.value).toBe(0);
  });

  it('includes timestamp and window boundaries in the metric payload', () => {
    telemetry.emitGameStarted({ trigger: 'menu' });
    telemetry.emitGameStarted({ trigger: 'replay' });

    clock += 5 * 60 * 1000;
    telemetry.maybeFlushMetrics();

    const metric = emitted.find((e) => e.name === 'replay_rate');
    expect(metric.payload.timestamp).toBeDefined();
    expect(metric.payload.window_start).toBeDefined();
    expect(metric.payload.window_end).toBeDefined();
    expect(metric.payload.window_end - metric.payload.window_start).toBe(5 * 60 * 1000);
  });
});
