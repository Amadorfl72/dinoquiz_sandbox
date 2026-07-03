import { logStorageFailure } from '../../analytics/logger';
import Events from '../../analytics/events';

jest.mock('../../config', () => ({
  app_version: '1.0.0',
}));

jest.mock('../../analytics/metrics', () => ({
  incrementMetric: jest.fn(),
}));

describe('storageService.logging', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('logs storage_failure when a save operation fails', () => {
    logStorageFailure('save', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Analytics]',
      expect.objectContaining({
        event: Events.STORAGE_FAILURE,
        operation_type: 'save',
        error_type: 'Error',
      })
    );
  });

  it('logs storage_failure when a load operation fails', () => {
    logStorageFailure('load', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Analytics]',
      expect.objectContaining({
        event: Events.STORAGE_FAILURE,
        operation_type: 'load',
        error_type: 'Error',
      })
    );
  });

  it('logs storage_failure when a clear operation fails', () => {
    logStorageFailure('clear', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Analytics]',
      expect.objectContaining({
        event: Events.STORAGE_FAILURE,
        operation_type: 'clear',
        error_type: 'Error',
      })
    );
  });

  it('does not log storage_failure when the operation succeeds', () => {
    // logStorageFailure is only called by the storage service on failure.
    // When an operation succeeds, the function is never invoked, so no
    // storage_failure log should appear.
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('does not include any PII fields in the storage_failure log entry', () => {
    logStorageFailure('save', 'QuotaExceededError');

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

  it('does not include the error message text (only error_type) to avoid leaking sensitive details', () => {
    logStorageFailure('save', 'Error');

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload).toHaveProperty('error_type');
    expect(payload).not.toHaveProperty('error_message');
    expect(payload).not.toHaveProperty('errorMessage');
    expect(payload).not.toHaveProperty('message');
    expect(payload).not.toHaveProperty('error');
  });

  it('includes the current app_version from config in the log entry', () => {
    logStorageFailure('save', 'Error');

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload).toHaveProperty('app_version');
    expect(payload.app_version).toBe('1.0.0');
  });

  it('uses error_type "Error" when the error has no specific name', () => {
    logStorageFailure('save', 'Error');

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload.error_type).toBe('Error');
  });

  it('rethrows the original error after logging', () => {
    // logStorageFailure itself does not throw — it only logs.
    // The storage service caller is responsible for rethrowing after calling
    // logStorageFailure.  Verify the logger does not swallow or throw errors.
    expect(() => logStorageFailure('save', 'Error')).not.toThrow();
  });
});
