import { TelemetryService } from '../src/telemetry';

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  let telemetryService: TelemetryService;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    mockEmit = jest.fn();
    telemetryService = new TelemetryService(mockEmit);
    jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Event: replay_clicked', () => {
    it('should emit a structured replay_clicked event with previous_score and timestamp', () => {
      const previousScore = 1500;
      telemetryService.trackReplayClicked(previousScore);

      expect(mockEmit).toHaveBeenCalledTimes(1);
      const emittedEvent = mockEmit.mock.calls[0][0];
      
      expect(emittedEvent.event_name).toBe('replay_clicked');
      expect(emittedEvent.previous_score).toBe(previousScore);
      expect(emittedEvent.timestamp).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('Event: game_started', () => {
    it('should emit a structured game_started event with trigger "replay"', () => {
      telemetryService.trackGameStarted('replay');

      expect(mockEmit).toHaveBeenCalledTimes(1);
      const emittedEvent = mockEmit.mock.calls[0][0];
      
      expect(emittedEvent.event_name).toBe('game_started');
      expect(emittedEvent.trigger).toBe('replay');
    });
  });

  describe('Metric: Replay Rate', () => {
    it('should calculate and emit the replay rate metric correctly', () => {
      // Simulate 10 game starts: 6 new, 4 replays
      for (let i = 0; i < 6; i++) telemetryService.trackGameStarted('new');
      for (let i = 0; i < 4; i++) telemetryService.trackGameStarted('replay');

      telemetryService.emitReplayRateMetric();

      const metricCall = mockEmit.mock.calls.find(
        (call) => call[0].metric_name === 'replay_rate'
      );
      
      expect(metricCall).toBeDefined();
      expect(metricCall[0].value).toBe(0.4); // 4 / 10
    });

    it('should emit the replay rate metric within 5 minutes of calculation', () => {
      telemetryService.trackGameStarted('new');
      telemetryService.trackGameStarted('replay');
      
      const startTime = Date.now();
      
      // Advance time by 4 minutes and 59 seconds
      jest.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);
      
      telemetryService.emitReplayRateMetric();
      
      const metricCall = mockEmit.mock.calls.find(
        (call) => call[0].metric_name === 'replay_rate'
      );
      
      expect(metricCall).toBeDefined();
      const emittedTime = new Date(metricCall[0].timestamp).getTime();
      expect(emittedTime - startTime).toBeLessThan(5 * 60 * 1000);
    });
  });
});
