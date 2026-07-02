const { Telemetry } = require('../../analytics/telemetry');

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event: replay_clicked', () => {
    it('debe registrar el evento replay_clicked con previous_score y timestamp', () => {
      const sendEventSpy = jest.spyOn(Telemetry, '_sendEvent').mockImplementation(() => {});
      const previousScore = 1200;
      Telemetry.logReplayClicked.call(Telemetry, previousScore);
      
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'replay_clicked',
          previous_score: previousScore,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Event: game_started', () => {
    it('debe registrar el evento game_started con trigger "replay"', () => {
      const sendEventSpy = jest.spyOn(Telemetry, '_sendEvent').mockImplementation(() => {});
      Telemetry.logGameStarted.call(Telemetry, 'replay');
      
      expect(sendEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'game_started',
          trigger: 'replay',
          timestamp: expect.any(String)
        })
      );
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
  });
});
