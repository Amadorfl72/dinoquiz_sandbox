const {
  emitReplayClicked,
  emitGameStartedReplay,
  calculateReplayRate,
  resetTelemetryState,
  getEmittedEvents,
  getEmittedMetrics,
} = require('../replayTelemetry');

describe('TRIOFSND-41: Telemetría de re-jugada', () => {
  beforeEach(() => {
    resetTelemetryState();
  });

  describe('emitReplayClicked', () => {
    it('debe emitir el evento replay_clicked con previous_score y timestamp', () => {
      const previousScore = 1500;
      const result = emitReplayClicked(previousScore);

      expect(result).toBe(true);
      const events = getEmittedEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.event_name).toBe('replay_clicked');
      expect(event.previous_score).toBe(1500);
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('debe emitir replay_clicked con previous_score igual a 0', () => {
      emitReplayClicked(0);
      const events = getEmittedEvents();
      expect(events[0].event_name).toBe('replay_clicked');
      expect(events[0].previous_score).toBe(0);
      expect(events[0].timestamp).toBeDefined();
    });

    it('debe emitir replay_clicked con un previous_score negativo válido', () => {
      emitReplayClicked(-50);
      const events = getEmittedEvents();
      expect(events[0].previous_score).toBe(-50);
    });

    it('debe rechazar previous_score que no sea número', () => {
      expect(() => emitReplayClicked('abc')).toThrow();
      expect(() => emitReplayClicked(null)).toThrow();
      expect(() => emitReplayClicked(undefined)).toThrow();
      expect(() => emitReplayClicked({})).toThrow();
      expect(getEmittedEvents()).toHaveLength(0);
    });

    it('debe rechazar previous_score NaN o Infinity', () => {
      expect(() => emitReplayClicked(NaN)).toThrow();
      expect(() => emitReplayClicked(Infinity)).toThrow();
      expect(() => emitReplayClicked(-Infinity)).toThrow();
      expect(getEmittedEvents()).toHaveLength(0);
    });

    it('debe generar timestamps distintos para eventos consecutivos', async () => {
      emitReplayClicked(100);
      await new Promise((r) => setTimeout(r, 5));
      emitReplayClicked(200);

      const events = getEmittedEvents();
      expect(events).toHaveLength(2);
      expect(events[0].timestamp).toBeLessThanOrEqual(events[1].timestamp);
    });

    it('debe incluir el timestamp en formato epoch milliseconds', () => {
      const before = Date.now();
      emitReplayClicked(500);
      const after = Date.now();

      const event = getEmittedEvents()[0];
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });

    it('debe permitir múltiples eventos replay_clicked', () => {
      emitReplayClicked(100);
      emitReplayClicked(200);
      emitReplayClicked(300);

      const events = getEmittedEvents();
      expect(events).toHaveLength(3);
      expect(events.every((e) => e.event_name === 'replay_clicked')).toBe(true);
    });
  });

  describe('emitGameStartedReplay', () => {
    it('debe emitir el evento game_started con trigger replay', () => {
      const result = emitGameStartedReplay();

      expect(result).toBe(true);
      const events = getEmittedEvents();
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.event_name).toBe('game_started');
      expect(event.trigger).toBe('replay');
    });

    it('el evento game_started con trigger replay debe incluir timestamp', () => {
      emitGameStartedReplay();
      const event = getEmittedEvents()[0];
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('debe emitir game_started con trigger exactamente igual a "replay"', () => {
      emitGameStartedReplay();
      const event = getEmittedEvents()[0];
      expect(event.trigger).toBe('replay');
      expect(typeof event.trigger).toBe('string');
    });

    it('no debe emitir game_started con trigger distinto a replay', () => {
      emitGameStartedReplay();
      const event = getEmittedEvents()[0];
      expect(event.trigger).not.toBe('new_game');
      expect(event.trigger).not.toBe('menu');
      expect(event.trigger).not.toBe('');
      expect(event.trigger).not.toBe(null);
      expect(event.trigger).not.toBe(undefined);
    });
  });

  describe('Secuencia de eventos de re-jugada', () => {
    it('debe registrar replay_clicked seguido de game_started con trigger replay', () => {
      emitReplayClicked(1200);
      emitGameStartedReplay();

      const events = getEmittedEvents();
      expect(events).toHaveLength(2);
      expect(events[0].event_name).toBe('replay_clicked');
      expect(events[0].previous_score).toBe(1200);
      expect(events[1].event_name).toBe('game_started');
      expect(events[1].trigger).toBe('replay');
    });

    it('debe mantener el orden temporal de los eventos', () => {
      emitReplayClicked(800);
      emitGameStartedReplay();

      const events = getEmittedEvents();
      expect(events[0].timestamp).toBeLessThanOrEqual(events[1].timestamp);
    });
  });

  describe('calculateReplayRate', () => {
    it('debe calcular la tasa de re-jugada correctamente', () => {
      // Simular 10 game_started normales y 5 por replay
      for (let i = 0; i < 10; i++) {
        getEmittedEvents().push({
          event_name: 'game_started',
          trigger: 'new_game',
          timestamp: Date.now(),
        });
      }
      for (let i = 0; i < 5; i++) {
        emitGameStartedReplay();
      }

      const replayRate = calculateReplayRate();
      // 5 replays de 15 game_started total = 0.3333...
      expect(replayRate).toBeCloseTo(5 / 15, 5);
    });

    it('debe retornar 0 cuando no hay eventos game_started', () => {
      const replayRate = calculateReplayRate();
      expect(replayRate).toBe(0);
    });

    it('debe retornar 1 cuando todos los game_started son replays', () => {
      for (let i = 0; i < 10; i++) {
        emitGameStartedReplay();
      }

      const replayRate = calculateReplayRate();
      expect(replayRate).toBe(1);
    });

    it('debe emitir la métrica replay_rate con los campos requeridos', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metrics = getEmittedMetrics();
      expect(metrics).toHaveLength(1);

      const metric = metrics[0];
      expect(metric.metric_name).toBe('replay_rate');
      expect(typeof metric.value).toBe('number');
      expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(metric.value).toBeLessThanOrEqual(1);
      expect(metric.timestamp).toBeDefined();
      expect(metric.window_minutes).toBe(5);
    });
  });
});