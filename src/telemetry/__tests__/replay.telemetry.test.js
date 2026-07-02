const { Telemetry } = require('../../analytics/telemetry');

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event: replay_clicked', () => {
    it('debe registrar el evento replay_clicked con previous_score y timestamp', () => {
      const previousScore = 1200;
      Telemetry.logReplayClicked(previousScore);
      
      expect(console.log).toHaveBeenCalledWith(
        'Sending telemetry event:', 
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
      Telemetry.logGameStarted('replay');
      
      expect(console.log).toHaveBeenCalledWith(
        'Sending telemetry event:', 
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
      const rate = Telemetry.calculateReplayRate();
      
      expect(console.log).toHaveBeenCalledWith(
        'Emitting metric:', 
        'replay_rate', 
        expect.any(Number),
        { window_minutes: 5 }
      );
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
  });
});