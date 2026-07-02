import { updateBestScore } from '../scoreService';
import { getAppVersion } from '../../config';

jest.mock('../../config', () => ({
  getAppVersion: jest.fn(() => '1.0.0'),
}));

describe('TRIOFSND-47: scoreService structured logging', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    getAppVersion.mockReturnValue('1.0.0');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('logs best_score_updated when a new best score is achieved', () => {
    updateBestScore(10, 5);

    expect(consoleSpy).toHaveBeenCalledWith(
      'best_score_updated',
      expect.objectContaining({
        event: 'best_score_updated',
        new_score: 10,
        previous_best: 5,
      })
    );
  });

  it('does not log best_score_updated when the new score is not greater than previous best', () => {
    updateBestScore(3, 5);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('logs best_score_updated when previous best is null (first score)', () => {
    updateBestScore(7, null);

    expect(consoleSpy).toHaveBeenCalledWith(
      'best_score_updated',
      expect.objectContaining({
        event: 'best_score_updated',
        new_score: 7,
        previous_best: null,
      })
    );
  });

  it('does not include any PII fields in the best_score_updated log entry', () => {
    updateBestScore(10, 5);

    const call = consoleSpy.mock.calls.find((c) => c[0] === 'best_score_updated');
    expect(call).toBeDefined();
    const logEntry = call[1];

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
      'password',
      'token',
    ];
    piiFields.forEach((field) => {
      expect(logEntry).not.toHaveProperty(field);
    });
  });

  it('includes the current app_version from config in the log entry', () => {
    getAppVersion.mockReturnValue('2.1.0');

    updateBestScore(10, 5);

    const call = consoleSpy.mock.calls.find((c) => c[0] === 'best_score_updated');
    expect(call).toBeDefined();
    expect(call[1]).toHaveProperty('app_version', '2.1.0');
  });

  it('emits exactly one structured log per best score update', () => {
    updateBestScore(10, 5);

    const bestScoreLogs = consoleSpy.mock.calls.filter(
      (c) => c[0] === 'best_score_updated'
    );
    expect(bestScoreLogs).toHaveLength(1);
  });
});
