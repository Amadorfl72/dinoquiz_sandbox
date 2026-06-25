const {
  emitReplayClicked,
  emitGameStarted,
  createTelemetryService,
} = require('../src/telemetry/replayTelemetry');

describe('TRIOFSND-41 - Replay telemetry events', () => {
  let telemetry;
  let emitted;

  beforeEach(() => {
    emitted = [];
    telemetry = createTelemetryService({
      sink: (event) => emitted.push(event),
      now: () => new Date('2024-01-01T10:00:00Z').getTime(),
    });
  });

  describe('replay_clicked', () => {
    it('emits a structured replay_clicked event', () => {
      telemetry.emitReplayClicked({ previousScore: 1250 });

      const evt = emitted.find((e) => e.name === 'replay_clicked');
      expect(evt).toBeDefined();
      expect(evt.name).toBe('replay_clicked');
    });

    it('includes previous_score in the payload', () => {
      telemetry.emitReplayClicked({ previousScore: 1250 });

      const evt = emitted.find((e) => e.name === 'replay_clicked');
      expect(evt.payload.previous_score).toBe(1250);
    });

    it('includes a timestamp in the payload', () => {
      telemetry.emitReplayClicked({ previousScore: 0 });

      const evt = emitted.find((e) => e.name === 'replay_clicked');
      expect(evt.payload.timestamp).toBe('2024-01-01T10:00:00.000Z');
    });

    it('does not emit replay_clicked when previous_score is missing', () => {
      expect(() => telemetry.emitReplayClicked({})).toThrow(/previous_score/i);
      expect(emitted.some((e) => e.name === 'replay_clicked')).toBe(false);
    });

    it('coerces numeric previous_score to a number', () => {
      telemetry.emitReplayClicked({ previousScore: '900' });
      const evt = emitted.find((e) => e.name === 'replay_clicked');
      expect(evt.payload.previous_score).toBe(900);
      expect(typeof evt.payload.previous_score).toBe('number');
    });
  });

  describe('game_started with replay trigger', () => {
    it('emits a structured game_started event', () => {
      telemetry.emitGameStarted({ trigger: 'replay' });

      const evt = emitted.find((e) => e.name === 'game_started');
      expect(evt).toBeDefined();
      expect(evt.name).toBe('game_started');
    });

    it('includes trigger equal to "replay"', () => {
      telemetry.emitGameStarted({ trigger: 'replay' });

      const evt = emitted.find((e) => e.name === 'game_started');
      expect(evt.payload.trigger).toBe('replay');
    });

    it('preserves other trigger values', () => {
      telemetry.emitGameStarted({ trigger: 'menu' });

      const evt = emitted.find((e) => e.name === 'game_started');
      expect(evt.payload.trigger).toBe('menu');
    });

    it('requires a trigger field', () => {
      expect(() => telemetry.emitGameStarted({})).toThrow(/trigger/i);
      expect(emitted.some((e) => e.name === 'game_started')).toBe(false);
    });
  });

  describe('replay flow ordering', () => {
    it('emits replay_clicked before game_started(replay) on a replay flow', () => {
      telemetry.emitReplayClicked({ previousScore: 500 });
      telemetry.emitGameStarted({ trigger: 'replay' });

      const names = emitted.map((e) => e.name);
      expect(names).toEqual(['replay_clicked', 'game_started']);
    });
  });
});
