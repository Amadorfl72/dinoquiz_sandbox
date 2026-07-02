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
  });
});
