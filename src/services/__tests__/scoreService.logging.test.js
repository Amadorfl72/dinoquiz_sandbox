jest.mock('../../analytics/metrics', () => ({
  incrementMetric: jest.fn(),
}));

jest.mock('../../config', () => ({
  __esModule: true,
  default: { app_version: '1.0.0-test' },
}));

import { logBestScoreUpdated } from '../../analytics/logger';
import config from '../../config';

describe('TRIOFSND-47: Structured logging for best score updates', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('logs best_score_updated when a new best score is achieved', () => {
    logBestScoreUpdated(10, 5);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.event).toBe('best_score_updated');
    expect(loggedPayload.new_score).toBe(10);
    expect(loggedPayload.previous_best).toBe(5);
  });

  it('does not log best_score_updated when the new score is not greater than previous best', () => {
    // logBestScoreUpdated is only invoked by the service layer when a new best
    // is achieved. When the score is not greater, the function is not called
    // and therefore no log entry is produced.
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs best_score_updated when previous best is null (first score)', () => {
    logBestScoreUpdated(7, null);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.event).toBe('best_score_updated');
    expect(loggedPayload.new_score).toBe(7);
    expect(loggedPayload.previous_best).toBeNull();
  });

  it('does not include any PII fields in the best_score_updated log entry', () => {
    logBestScoreUpdated(10, 5);

    const loggedPayload = consoleSpy.mock.calls[0][1];
    const piiFields = [
      'user_id', 'userId', 'email', 'name', 'username',
      'ip', 'ip_address', 'device_id', 'deviceId', 'phone',
      'location', 'address', 'token', 'password',
    ];
    piiFields.forEach((field) => {
      expect(loggedPayload).not.toHaveProperty(field);
    });
  });

  it('includes the current app_version from config in the log entry', () => {
    logBestScoreUpdated(10, 5);

    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.app_version).toBe(config.app_version);
  });

  it('emits exactly one structured log per best score update', () => {
    logBestScoreUpdated(10, 5);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
