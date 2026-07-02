const { TelemetryService } = require('../telemetryService');
const { ReplayManager } = require('../replayManager');

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  let telemetryService;
  let replayManager;

  beforeEach(() => {
    telemetryService = {
      track: jest.fn(),
      emitMetric: jest.fn(),
    };
    replayManager = new ReplayManager(telemetryService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Event: replay_clicked', () => {
    it('debe registrar el evento replay_clicked con previous_score y timestamp', () => {
      const previousScore = 1200;
      const expectedTimestamp = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(expectedTimestamp);

      replayManager.onReplayClick(previousScore);

      expect(telemetryService.track).toHaveBeenCalledWith('replay_clicked', {
        previous_score: previousScore,
        timestamp: expectedTimestamp
      });
    });
  });

  describe('Event: game_started', () => {
    it('debe registrar el evento game_started con trigger "replay"', () => {
      replayManager.startGameFromReplay();

      expect(telemetryService.track).toHaveBeenCalledWith('game_started', {
        trigger: 'replay'
      });
    });
  });

  describe('Métrica: Tasa de re-jugada', () => {
    it('debe calcular y emitir la métrica de tasa de re-jugada en una ventana de <5 min', () => {
      const startTime = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(startTime);

      // Simular 10 inicios de juego normales
      for (let i = 0; i < 10; i++) {
        replayManager.startNewGame();
      }

      // Simular 4 re-jugadas
      for (let i = 0; i < 4; i++) {
        replayManager.onReplayClick(100);
        replayManager.startGameFromReplay();
      }

      // Avanzar el tiempo 4 minutos (menos de 5 min)
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 4 * 60 * 1000);

      replayManager.calculateAndEmitReplayRate();

      expect(telemetryService.emitMetric).toHaveBeenCalledWith(
        'replay_rate',
        expect.any(Number),
        expect.objectContaining({ window_minutes: 5 })
      );

      const metricCall = telemetryService.emitMetric.mock.calls[0];
      // 4 replays / 10 games = 0.4
      expect(metricCall[1]).toBeCloseTo(0.4);
    });
  });
});