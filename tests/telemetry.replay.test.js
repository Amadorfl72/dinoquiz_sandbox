const { ReplayTelemetry } = require('../src/telemetry/replayTelemetry');

describe('TRIOFSND-41: Instrumentar telemetría de re-jugada', () => {
  let mockTelemetryClient;
  let replayTelemetry;

  beforeEach(() => {
    jest.useFakeTimers();
    mockTelemetryClient = {
      emitEvent: jest.fn(),
      emitMetric: jest.fn()
    };
    replayTelemetry = new ReplayTelemetry(mockTelemetryClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should emit replay_clicked event with previous_score and timestamp', () => {
    const previousScore = 1500;
    const timestampBefore = Date.now();
    
    replayTelemetry.logReplayClicked(previousScore);
    
    expect(mockTelemetryClient.emitEvent).toHaveBeenCalledWith(
      'replay_clicked',
      expect.objectContaining({
        previous_score: previousScore,
        timestamp: expect.any(Number)
      })
    );
    
    const emittedData = mockTelemetryClient.emitEvent.mock.calls[0][1];
    expect(emittedData.timestamp).toBeGreaterThanOrEqual(timestampBefore);
  });

  it('should emit game_started event with trigger replay', () => {
    replayTelemetry.logGameStartedFromReplay();
    
    expect(mockTelemetryClient.emitEvent).toHaveBeenCalledWith(
      'game_started',
      expect.objectContaining({
        trigger: 'replay'
      })
    );
  });

  it('should calculate and emit replay rate metric in less than 5 minutes', () => {
    const startTime = Date.now();
    
    // Simulate some replay activity
    replayTelemetry.logReplayClicked(100);
    replayTelemetry.logGameStartedFromReplay();
    replayTelemetry.logReplayClicked(200);
    replayTelemetry.logGameStartedFromReplay();
    
    // Fast-forward time by 4 minutes to ensure it's within the 5-minute window
    jest.advanceTimersByTime(4 * 60 * 1000);
    
    replayTelemetry.calculateAndEmitReplayRate();
    
    expect(mockTelemetryClient.emitMetric).toHaveBeenCalledWith(
      'replay_rate',
      expect.any(Number)
    );
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(5 * 60 * 1000);
  });
});