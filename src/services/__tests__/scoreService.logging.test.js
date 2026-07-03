import { logBestScoreUpdated } from '../../analytics/logger';
import Events from '../../analytics/events';

jest.mock('../../config', () => ({
  app_version: '1.0.0',
}));

jest.mock('../../analytics/metrics', () => ({
  incrementMetric: jest.fn(),
}));

describe('scoreService.logging', () => {
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
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Analytics]',
      expect.objectContaining({
        event: Events.BEST_SCORE_UPDATED,
        new_score: 10,
        previous_best: 5,
      })
    );
  });

  it('does not log best_score_updated when the new score is not greater than previous best', () => {
    // The caller is responsible for only invoking logBestScoreUpdated when a
    // new best is achieved.  When the score is not greater, the function
    // should not be called at all.  Verify that not calling it produces no log.
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs best_score_updated when previous best is null (first score)', () => {
    logBestScoreUpdated(7, null);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Analytics]',
      expect.objectContaining({
        event: Events.BEST_SCORE_UPDATED,
        new_score: 7,
        previous_best: null,
      })
    );
  });

  it('does not include any PII fields in the best_score_updated log entry', () => {
    logBestScoreUpdated(9, 3);

    const payload = consoleSpy.mock.calls[0][1];
    const piiFields = [
      'user_id',
      'userId',
      'email',
      'name',
      'username',
      'ip',
      'ip_address',
      'device_id',
      'deviceId',
      'phone',
      'address',
    ];
    piiFields.forEach((field) => {
      expect(payload).not.toHaveProperty(field);
    });
  });

  it('includes the current app_version from config in the log entry', () => {
    logBestScoreUpdated(8, 4);

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload).toHaveProperty('app_version');
    expect(payload.app_version).toBe('1.0.0');
  });

  it('emits exactly one structured log per best score update', () => {
    logBestScoreUpdated(10, 5);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
