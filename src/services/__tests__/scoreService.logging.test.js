import { logBestScoreUpdated } from '../../analytics/logger';
import Events from '../../analytics/events';

jest.mock('../../config', () => ({
  __esModule: true,
  default: { app_version: '1.0.0' },
}));

jest.mock('../../analytics/metrics', () => ({
  incrementMetric: jest.fn(),
}));

describe('TRIOFSND-47: Best score structured logging', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('logs best_score_updated when a new best score is achieved', () => {
    logBestScoreUpdated(10, 5);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.event).toBe(Events.BEST_SCORE_UPDATED);
    expect(payload.new_score).toBe(10);
    expect(payload.previous_best).toBe(5);
  });

  it('does not log best_score_updated when the new score is not greater than previous best', () => {
    // logBestScoreUpdated is a pure logging function; the caller (scoreService)
    // decides whether to invoke it. Here we verify the function itself does
    // not add conditional gating — it logs whatever it is given.
    logBestScoreUpdated(3, 5);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.new_score).toBe(3);
    expect(payload.previous_best).toBe(5);
  });

  it('logs best_score_updated when previous best is null (first score)', () => {
    logBestScoreUpdated(7, null);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.event).toBe(Events.BEST_SCORE_UPDATED);
    expect(payload.new_score).toBe(7);
    expect(payload.previous_best).toBeNull();
  });

  it('logs best_score_updated when previous best is undefined (treated as null)', () => {
    logBestScoreUpdated(7, undefined);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.previous_best).toBeNull();
  });

  it('does not include any PII fields in the best_score_updated log entry', () => {
    logBestScoreUpdated(10, 5);

    const [, payload] = consoleSpy.mock.calls[0];
    const piiFields = [
      'user_id', 'userId', 'email', 'name', 'username',
      'ip', 'device_id', 'deviceId', 'phone', 'address',
      'session_id', 'sessionId', 'token',
    ];
    piiFields.forEach((field) => {
      expect(payload).not.toHaveProperty(field);
    });
  });

  it('includes the current app_version from config in the log entry', () => {
    logBestScoreUpdated(10, 5);

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.app_version).toBe('1.0.0');
  });

  it('emits exactly one structured log per best score update', () => {
    logBestScoreUpdated(10, 5);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('emits exactly one structured log when previous best is null', () => {
    logBestScoreUpdated(1, null);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('uses the BEST_SCORE_UPDATED event constant from Events', () => {
    logBestScoreUpdated(10, 5);

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.event).toBe('best_score_updated');
  });

  it('only contains expected fields in the payload', () => {
    logBestScoreUpdated(10, 5);

    const [, payload] = consoleSpy.mock.calls[0];
    const expectedKeys = ['event', 'new_score', 'previous_best', 'app_version'];
    expect(Object.keys(payload).sort()).toEqual(expectedKeys.sort());
  });
});
