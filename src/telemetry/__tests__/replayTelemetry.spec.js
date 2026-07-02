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

    it('debe retornar 0 cuando no hay game_started con trigger replay', () => {
      for (let i = 0; i < 5; i++) {
        getEmittedEvents().push({
          event_name: 'game_started',
          trigger: 'new_game',
          timestamp: Date.now(),
        });
      }

      const replayRate = calculateReplayRate();
      expect(replayRate).toBe(0);
    });

    it('debe retornar 1 cuando todos los game_started son por replay', () => {
      for (let i = 0; i < 8; i++) {
        emitGameStartedReplay();
      }

      const replayRate = calculateReplayRate();
      expect(replayRate).toBe(1);
    });

    it('debe emitir la métrica de tasa de re-jugada', () => {
      emitGameStartedReplay();
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: Date.now(),
      });

      calculateReplayRate();

      const metrics = getEmittedMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metric_name).toBe('replay_rate');
      expect(typeof metrics[0].value).toBe('number');
      expect(metrics[0].value).toBeGreaterThanOrEqual(0);
      expect(metrics[0].value).toBeLessThanOrEqual(1);
    });

    it('la métrica debe incluir timestamp', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metric = getEmittedMetrics()[0];
      expect(metric.timestamp).toBeDefined();
      expect(typeof metric.timestamp).toBe('number');
      expect(metric.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Cálculo de tasa de re-jugada en ventana de <5 min', () => {
    it('debe calcular la tasa considerando solo eventos dentro de la ventana de 5 minutos', () => {
      const now = Date.now();
      const sixMinutesAgo = now - 6 * 60 * 1000;
      const threeMinutesAgo = now - 3 * 60 * 1000;

      // Eventos fuera de ventana (hace 6 min)
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: sixMinutesAgo,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: sixMinutesAgo,
      });

      // Eventos dentro de ventana (hace 3 min)
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: threeMinutesAgo,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: threeMinutesAgo,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: now,
      });

      const replayRate = calculateReplayRate();
      // Ventana de 5 min: 2 replays de 3 game_started = 0.6666...
      expect(replayRate).toBeCloseTo(2 / 3, 5);
    });

    it('debe excluir eventos con timestamp mayor a 5 minutos de antigüedad', () => {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;

      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: tenMinutesAgo,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: tenMinutesAgo,
      });

      const replayRate = calculateReplayRate();
      expect(replayRate).toBe(0);
    });

    it('debe incluir eventos en el límite exacto de 5 minutos', () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'replay',
        timestamp: fiveMinutesAgo,
      });
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: fiveMinutesAgo,
      });

      const replayRate = calculateReplayRate();
      expect(replayRate).toBeCloseTo(0.5, 5);
    });

    it('debe incluir eventos con timestamp actual', () => {
      emitGameStartedReplay();
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: Date.now(),
      });

      const replayRate = calculateReplayRate();
      expect(replayRate).toBeCloseTo(0.5, 5);
    });

    it('debe emitir la métrica con la ventana temporal especificada', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metric = getEmittedMetrics()[0];
      expect(metric.window_minutes).toBeDefined();
      expect(metric.window_minutes).toBe(5);
    });
  });

  describe('Estructura de eventos', () => {
    it('el evento replay_clicked debe ser un objeto estructurado válido', () => {
      emitReplayClicked(750);
      const event = getEmittedEvents()[0];

      expect(event).toEqual(
        expect.objectContaining({
          event_name: 'replay_clicked',
          previous_score: expect.any(Number),
          timestamp: expect.any(Number),
        })
      );
    });

    it('el evento game_started con trigger replay debe ser un objeto estructurado válido', () => {
      emitGameStartedReplay();
      const event = getEmittedEvents()[0];

      expect(event).toEqual(
        expect.objectContaining({
          event_name: 'game_started',
          trigger: 'replay',
          timestamp: expect.any(Number),
        })
      );
    });

    it('la métrica replay_rate debe ser un objeto estructurado válido', () => {
      emitGameStartedReplay();
      calculateReplayRate();

      const metric = getEmittedMetrics()[0];
      expect(metric).toEqual(
        expect.objectContaining({
          metric_name: 'replay_rate',
          value: expect.any(Number),
          timestamp: expect.any(Number),
          window_minutes: expect.any(Number),
        })
      );
    });
  });

  describe('Casos edge', () => {
    it('debe manejar previous_score con valores decimales', () => {
      emitReplayClicked(123.45);
      const event = getEmittedEvents()[0];
      expect(event.previous_score).toBe(123.45);
    });

    it('debe manejar previous_score con valor máximo seguro de JavaScript', () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      emitReplayClicked(maxSafe);
      const event = getEmittedEvents()[0];
      expect(event.previous_score).toBe(maxSafe);
    });

    it('calculateReplayRate debe ser idempotente en cuanto al cálculo', () => {
      emitGameStartedReplay();
      getEmittedEvents().push({
        event_name: 'game_started',
        trigger: 'new_game',
        timestamp: Date.now(),
      });

      const rate1 = calculateReplayRate();
      const rate2 = calculateReplayRate();
      expect(rate1).toBe(rate2);
    });

    it('debe emitir métrica cada vez que se llama calculateReplayRate', () => {
      emitGameStartedReplay();
      calculateReplayRate();
      calculateReplayRate();

      const metrics = getEmittedMetrics();
      expect(metrics).toHaveLength(2);
    });
  });
});
