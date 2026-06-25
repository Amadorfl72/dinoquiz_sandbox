import { GameTelemetryManager, TelemetryService } from '../src/telemetry';

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  let mockTelemetryService: jest.Mocked<TelemetryService>;
  let manager: GameTelemetryManager;

  beforeEach(() => {
    mockTelemetryService = {
      logEvent: jest.fn(),
      emitMetric: jest.fn(),
    } as unknown as jest.Mocked<TelemetryService>;
    
    manager = new GameTelemetryManager(mockTelemetryService);
  });

  describe('replay_clicked event', () => {
    it('should register replay_clicked with previous_score and timestamp', () => {
      const previousScore = 1200;
      const before = Date.now();
      
      manager.handleReplayClick(previousScore);
      
      const after = Date.now();

      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith(
        'replay_clicked',
        expect.objectContaining({
          previous_score: previousScore,
          timestamp: expect.any(Number)
        })
      );
      
      const payload = mockTelemetryService.logEvent.mock.calls[0][1];
      expect(payload.timestamp).toBeGreaterThanOrEqual(before);
      expect(payload.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('game_started event', () => {
    it('should register game_started with trigger replay when starting from replay', () => {
      manager.startGame('replay');
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith('game_started', {
        trigger: 'replay'
      });
    });

    it('should not set trigger to replay for normal game starts', () => {
      manager.startGame('new');
      
      expect(mockTelemetryService.logEvent).toHaveBeenCalledWith('game_started', {
        trigger: 'new'
      });
      expect(mockTelemetryService.logEvent).not.toHaveBeenCalledWith('game_started', {
        trigger: 'replay'
      });
    });
  });

  describe('replay_rate metric', () => {
    it('should calculate and emit replay_rate metric correctly', () => {
      manager.startGame('new');
      manager.startGame('new');
      manager.startGame('replay');
      
      manager.emitReplayRate();

      // 1 replay out of 3 total games = 0.333...
      expect(mockTelemetryService.emitMetric).toHaveBeenCalledWith(
        'replay_rate',
        expect.closeTo(0.3333, 2)
      );
    });

    it('should calculate and emit replay_rate metric in less than 5 minutes', () => {
      const startTime = Date.now();
      
      manager.emitReplayRate();
      
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5 * 60 * 1000);
    });
  });
});