import { TelemetryService } from './telemetry';

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  let telemetryService: TelemetryService;
  let mockEmitEvent: jest.Mock;
  let mockEmitMetric: jest.Mock;

  beforeEach(() => {
    mockEmitEvent = jest.fn();
    mockEmitMetric = jest.fn();
    telemetryService = new TelemetryService(mockEmitEvent, mockEmitMetric);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Event Tracking', () => {
    it('should register "replay_clicked" event with previous_score and timestamp', () => {
      const previousScore = 1500;
      const fixedTimestamp = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp);

      telemetryService.trackReplayClicked(previousScore);

      expect(mockEmitEvent).toHaveBeenCalledWith('replay_clicked', {
        previous_score: previousScore,
        timestamp: fixedTimestamp
      });
    });

    it('should register "game_started" event with trigger "replay" when started from replay', () => {
      telemetryService.trackGameStarted('replay');

      expect(mockEmitEvent).toHaveBeenCalledWith('game_started', {
        trigger: 'replay'
      });
    });

    it('should register "game_started" event with other triggers correctly', () => {
      telemetryService.trackGameStarted('new_game');

      expect(mockEmitEvent).toHaveBeenCalledWith('game_started', {
        trigger: 'new_game'
      });
    });
  });

  describe('Replay Rate Metric', () => {
    it('should calculate and emit the replay rate metric within 5 minutes', () => {
      // Simulate 3 normal starts and 1 replay start
      telemetryService.trackGameStarted('new_game');
      telemetryService.trackGameStarted('new_game');
      telemetryService.trackGameStarted('new_game');
      telemetryService.trackGameStarted('replay');

      // Start the periodic metric emission
      telemetryService.startMetricEmission();

      // Advance time by 4 minutes (less than 5 min requirement)
      jest.advanceTimersByTime(4 * 60 * 1000);

      expect(mockEmitMetric).toHaveBeenCalledWith('replay_rate', expect.any(Number));
      
      const replayRate = mockEmitMetric.mock.calls[0][1];
      // 1 replay out of 4 total games = 0.25
      expect(replayRate).toBeCloseTo(0.25, 2);
    });

    it('should handle replay rate calculation when no games have been played', () => {
      telemetryService.startMetricEmission();

      jest.advanceTimersByTime(4 * 60 * 1000);

      expect(mockEmitMetric).toHaveBeenCalledWith('replay_rate', 0);
    });

    it('should emit the metric periodically at an interval of less than 5 minutes', () => {
      telemetryService.trackGameStarted('new_game');
      telemetryService.trackGameStarted('replay');

      telemetryService.startMetricEmission();

      // Advance time by 4 minutes
      jest.advanceTimersByTime(4 * 60 * 1000);
      expect(mockEmitMetric).toHaveBeenCalledTimes(1);

      // Advance time by another 4 minutes (total 8 minutes)
      jest.advanceTimersByTime(4 * 60 * 1000);
      expect(mockEmitMetric).toHaveBeenCalledTimes(2);
    });
  });
});