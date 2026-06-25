import { ReplayManager } from '../src/ReplayManager';
import { TelemetryService } from '../src/TelemetryService';

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  let telemetryService: jest.Mocked<TelemetryService>;
  let replayManager: ReplayManager;

  beforeEach(() => {
    telemetryService = {
      trackEvent: jest.fn(),
      emitMetric: jest.fn(),
    } as unknown as jest.Mocked<TelemetryService>;
    replayManager = new ReplayManager(telemetryService);
  });

  describe('Event Tracking', () => {
    it('should emit "replay_clicked" event with previous_score and timestamp', () => {
      const previousScore = 1500;
      const beforeTime = Date.now();
      
      replayManager.handleReplayClick(previousScore);
      
      expect(telemetryService.trackEvent).toHaveBeenCalledWith('replay_clicked', {
        previous_score: previousScore,
        timestamp: expect.any(Number)
      });
      
      const emittedTimestamp = telemetryService.trackEvent.mock.calls[0][1].timestamp;
      expect(emittedTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(emittedTimestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should emit "game_started" event with trigger "replay" when game starts from replay', () => {
      replayManager.startGame('replay');
      
      expect(telemetryService.trackEvent).toHaveBeenCalledWith('game_started', {
        trigger: 'replay'
      });
    });

    it('should emit "game_started" event with trigger "new" when game starts normally', () => {
      replayManager.startGame('new');
      
      expect(telemetryService.trackEvent).toHaveBeenCalledWith('game_started', {
        trigger: 'new'
      });
    });
  });

  describe('Replay Rate Metric', () => {
    it('should calculate and emit replay rate metric correctly', () => {
      replayManager.startGame('new');
      replayManager.startGame('new');
      replayManager.startGame('replay');
      replayManager.startGame('replay');
      
      replayManager.emitReplayRate();
      
      // 2 replays out of 4 total games = 0.5
      expect(telemetryService.emitMetric).toHaveBeenCalledWith('replay_rate', 0.5);
    });

    it('should emit replay rate metric within 5 minutes window', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);
      
      replayManager.startGame('new');
      replayManager.startGame('replay');
      
      // Advance time by 4 minutes (less than 5 min)
      jest.advanceTimersByTime(4 * 60 * 1000);
      replayManager.emitReplayRate();
      
      expect(telemetryService.emitMetric).toHaveBeenCalledWith('replay_rate', 0.5);
      
      jest.useRealTimers();
    });

    it('should not include events older than 5 minutes in the metric calculation', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);
      
      replayManager.startGame('new');
      replayManager.startGame('replay');
      
      // Advance time by 6 minutes (more than 5 min)
      jest.advanceTimersByTime(6 * 60 * 1000);
      replayManager.startGame('new');
      replayManager.startGame('new');
      
      replayManager.emitReplayRate();
      
      // Only the last 2 'new' games are within the 5 min window, 0 replays
      expect(telemetryService.emitMetric).toHaveBeenCalledWith('replay_rate', 0);
      
      jest.useRealTimers();
    });
  });
});