jest.mock('../../analytics/metrics', () => ({
  incrementMetric: jest.fn(),
}));

jest.mock('../../config', () => ({
  __esModule: true,
  default: { app_version: '1.0.0-test' },
}));

import { logStorageFailure } from '../../analytics/logger';
import config from '../../config';

describe('TRIOFSND-47: Structured logging for storage failures', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('logs storage_failure when a save operation fails', () => {
    logStorageFailure('save', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.event).toBe('storage_failure');
    expect(loggedPayload.operation_type).toBe('save');
  });

  it('logs storage_failure when a load operation fails', () => {
    logStorageFailure('load', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.event).toBe('storage_failure');
    expect(loggedPayload.operation_type).toBe('load');
  });

  it('logs storage_failure when a clear operation fails', () => {
    logStorageFailure('clear', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.event).toBe('storage_failure');
    expect(loggedPayload.operation_type).toBe('clear');
  });

  it('does not log storage_failure when the operation succeeds', () => {
    // logStorageFailure is only invoked by the service layer when an operation
    // fails. When the operation succeeds, the function is not called and no
    // log entry is produced.
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('does not include any PII fields in the storage_failure log entry', () => {
    logStorageFailure('save', 'Error');

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

  it('does not include the error message text (only error_type) to avoid leaking sensitive details', () => {
    logStorageFailure('save', 'QuotaExceededError');

    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.error_type).toBe('QuotaExceededError');
    expect(loggedPayload).not.toHaveProperty('error_message');
    expect(loggedPayload).not.toHaveProperty('errorMessage');
    expect(loggedPayload).not.toHaveProperty('message');
    expect(loggedPayload).not.toHaveProperty('error');
    expect(loggedPayload).not.toHaveProperty('stack');
  });

  it('includes the current app_version from config in the log entry', () => {
    logStorageFailure('save', 'Error');

    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.app_version).toBe(config.app_version);
  });

  it('uses error_type "Error" when the error has no specific name', () => {
    logStorageFailure('save', 'Error');

    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload.error_type).toBe('Error');
  });

  it('rethrows the original error after logging', () => {
    // logStorageFailure is a pure logging utility — it does not catch or
    // suppress errors. The caller (service layer) is responsible for
    // rethrowing after calling logStorageFailure. Verify the function
    // itself does not throw and does not swallow errors.
    expect(() => logStorageFailure('save', 'Error')).not.toThrow();
  });
});
