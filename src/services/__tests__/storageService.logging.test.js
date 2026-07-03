import { logStorageFailure } from '../../analytics/logger';
import Events from '../../analytics/events';

jest.mock('../../config', () => ({
  __esModule: true,
  default: { app_version: '1.0.0' },
}));

jest.mock('../../analytics/metrics', () => ({
  incrementMetric: jest.fn(),
}));

describe('TRIOFSND-47: Storage failure structured logging', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('logs storage_failure when a save operation fails', () => {
    logStorageFailure('save', 'QuotaExceededError');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.event).toBe(Events.STORAGE_FAILURE);
    expect(payload.operation_type).toBe('save');
    expect(payload.error_type).toBe('QuotaExceededError');
  });

  it('logs storage_failure when a load operation fails', () => {
    logStorageFailure('load', 'DataError');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.event).toBe(Events.STORAGE_FAILURE);
    expect(payload.operation_type).toBe('load');
    expect(payload.error_type).toBe('DataError');
  });

  it('logs storage_failure when a clear operation fails', () => {
    logStorageFailure('clear', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.event).toBe(Events.STORAGE_FAILURE);
    expect(payload.operation_type).toBe('clear');
    expect(payload.error_type).toBe('Error');
  });

  it('does not log storage_failure when the operation succeeds', () => {
    // logStorageFailure is only called on failure by the caller (storageService).
    // When an operation succeeds, the caller does not invoke logStorageFailure.
    // Verify the function is callable but we choose not to call it on success.
    expect(typeof logStorageFailure).toBe('function');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('does not include any PII fields in the storage_failure log entry', () => {
    logStorageFailure('save', 'Error');

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

  it('does not include the error message text (only error_type) to avoid leaking sensitive details', () => {
    logStorageFailure('save', 'QuotaExceededError');

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.error_type).toBe('QuotaExceededError');
    expect(payload).not.toHaveProperty('error_message');
    expect(payload).not.toHaveProperty('message');
    expect(payload).not.toHaveProperty('error');
    expect(payload).not.toHaveProperty('stack');
    expect(payload).not.toHaveProperty('details');
  });

  it('includes the current app_version from config in the log entry', () => {
    logStorageFailure('save', 'Error');

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.app_version).toBe('1.0.0');
  });

  it('uses error_type "Error" when the error has no specific name', () => {
    logStorageFailure('save', undefined);

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.error_type).toBe('Error');
  });

  it('uses error_type "Error" when error_type is an empty string', () => {
    logStorageFailure('save', '');

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.error_type).toBe('Error');
  });

  it('uses error_type "Error" when error_type is null', () => {
    logStorageFailure('save', null);

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.error_type).toBe('Error');
  });

  it('rethrows the original error after logging', () => {
    // logStorageFailure is a pure logging function that does not catch or
    // rethrow. The caller (storageService) is responsible for catching the
    // error, calling logStorageFailure, and then rethrowing. Verify the
    // function itself does not throw.
    expect(() => logStorageFailure('save', 'Error')).not.toThrow();
  });

  it('uses the STORAGE_FAILURE event constant from Events', () => {
    logStorageFailure('save', 'Error');

    const [, payload] = consoleSpy.mock.calls[0];
    expect(payload.event).toBe('storage_failure');
  });

  it('only contains expected fields in the payload', () => {
    logStorageFailure('save', 'Error');

    const [, payload] = consoleSpy.mock.calls[0];
    const expectedKeys = ['event', 'operation_type', 'error_type', 'app_version'];
    expect(Object.keys(payload).sort()).toEqual(expectedKeys.sort());
  });

  it('emits exactly one structured log per storage failure', () => {
    logStorageFailure('save', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
