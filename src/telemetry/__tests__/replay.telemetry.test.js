const { Telemetry } = require('../../analytics/telemetry');

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  let sendEventSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    sendEventSpy = jest.spyOn(Telemetry, '_sendEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Event: replay_clicked', () => {
    it('debe registrar el evento replay_clicked con previous_score y timestamp', () => {
      const previousScore = 1200;
      Telemetry.logReplayClicked.call(Telemetry, previousScore);

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'replay_clicked',
          previous_score: previousScore,
          timestamp: expect.any(String)
        })
      );
    });

    it('el timestamp debe ser una fecha ISO válida', () => {
      Telemetry.logReplayClicked.call(Telemetry, 500);
      const event = sendEventSpy.mock.calls[0][0];
      const parsed = new Date(event.timestamp);
      expect(parsed.toString()).not.toBe('Invalid Date');
    });

    it('debe registrar replay_clicked con previous_score igual a 0', () => {
      Telemetry.logReplayClicked.call(Telemetry, 0);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.previous_score).toBe(0);
    });

    it('debe registrar replay_clicked con previous_score negativo', () => {
      Telemetry.logReplayClicked.call(Telemetry, -25);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.previous_score).toBe(-25);
    });

    it('no debe incluir la propiedad trigger en replay_clicked', () => {
      Telemetry.logReplayClicked.call(Telemetry, 100);
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.trigger).toBeUndefined();
    });
  });

  describe('Event: game_started', () => {
    it('debe registrar el evento game_started con trigger "replay"', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');

      expect(sendEventSpy).toHaveBeenCalledTimes(1);
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'game_started',
          trigger: 'replay',
          timestamp: expect.any(String)
        })
      );
    });

    it('el timestamp de game_started debe ser una fecha ISO válida', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      const parsed = new Date(event.timestamp);
      expect(parsed.toString()).not.toBe('Invalid Date');
    });

    it('debe registrar game_started con trigger distinto cuando se pasa otro valor', () => {
      Telemetry.logGameStarted.call(Telemetry, 'new_game');
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.trigger).toBe('new_game');
    });

    it('no debe incluir previous_score en game_started', () => {
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      const event = sendEventSpy.mock.calls[0][0];
      expect(event.previous_score).toBeUndefined();
    });
  });

  describe('Métrica: Tasa de re-jugada', () => {
    it('debe calcular y emitir la métrica de tasa de re-jugada en una ventana de <5 min', () => {
      const calculateRateSpy = jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.4);
      const emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});

      const rate = Telemetry.calculateReplayRate.call(Telemetry);

      expect(calculateRateSpy).toHaveBeenCalledWith('replay');
      expect(emitMetricSpy).toHaveBeenCalledWith(
        'replay_rate',
        0.4,
        { window_minutes: 5 }
      );
      expect(rate).toBe(0.4);
    });

    it('la ventana de la métrica debe ser exactamente 5 minutos', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.2);
      const emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});

      Telemetry.calculateReplayRate.call(Telemetry);

      expect(emitMetricSpy.mock.calls[0][2]).toEqual({ window_minutes: 5 });
    });

    it('debe retornar el mismo valor que emite en la métrica', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.65);
      const emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});

      const rate = Telemetry.calculateReplayRate.call(Telemetry);

      expect(emitMetricSpy.mock.calls[0][1]).toBe(rate);
    });

    it('el nombre de la métrica emitida debe ser replay_rate', () => {
      jest.spyOn(Telemetry, '_calculateRate').mockReturnValue(0.1);
      const emitMetricSpy = jest.spyOn(Telemetry, '_emitMetric').mockImplementation(() => {});

      Telemetry.calculateReplayRate.call(Telemetry);

      expect(emitMetricSpy.mock.calls[0][0]).toBe('replay_rate');
    });
  });

  describe('_sendEvent: integración con window.analytics', () => {
    beforeEach(() => {
      sendEventSpy.mockRestore();
    });

    afterEach(() => {
      delete global.window.analytics;
    });

    it('debe llamar a window.analytics.track para replay_clicked con previous_score', () => {
      global.window.analytics = { track: jest.fn(), metric: jest.fn() };
      jest.spyOn(console, 'log').mockImplementation(() => {});

      Telemetry._sendEvent.call(Telemetry, {
        name: 'replay_clicked',
        timestamp: '2024-01-01T00:00:00.000Z',
        previous_score: 300
      });

      expect(global.window.analytics.track).toHaveBeenCalledWith('replay_clicked', {
        timestamp: '2024-01-01T00:00:00.000Z',
        previous_score: 300
      });
      jest.restoreAllMocks();
    });

    it('debe llamar a window.analytics.track para game_started con trigger', () => {
      global.window.analytics = { track: jest.fn(), metric: jest.fn() };
      jest.spyOn(console, 'log').mockImplementation(() => {});

      Telemetry._sendEvent.call(Telemetry, {
        name: 'game_started',
        timestamp: '2024-01-01T00:00:00.000Z',
        trigger: 'replay'
      });

      expect(global.window.analytics.track).toHaveBeenCalledWith('game_started', {
        timestamp: '2024-01-01T00:00:00.000Z',
        trigger: 'replay'
      });
      jest.restoreAllMocks();
    });

    it('no debe lanzar si window.analytics no existe', () => {
      delete global.window.analytics;
      jest.spyOn(console, 'log').mockImplementation(() => {});

      expect(() => {
        Telemetry._sendEvent.call(Telemetry, {
          name: 'replay_clicked',
          timestamp: '2024-01-01T00:00:00.000Z',
          previous_score: 100
        });
      }).not.toThrow();
      jest.restoreAllMocks();
    });
  });

  describe('_emitMetric: integración con window.analytics', () => {
    beforeEach(() => {
      sendEventSpy.mockRestore();
    });

    afterEach(() => {
      delete global.window.analytics;
    });

    it('debe llamar a window.analytics.metric con nombre, valor y atributos', () => {
      global.window.analytics = { track: jest.fn(), metric: jest.fn() };
      jest.spyOn(console, 'log').mockImplementation(() => {});

      Telemetry._emitMetric.call(Telemetry, 'replay_rate', 0.5, { window_minutes: 5 });

      expect(global.window.analytics.metric).toHaveBeenCalledWith('replay_rate', 0.5, { window_minutes: 5 });
      jest.restoreAllMocks();
    });
  });
});
