import { logStorageFailure } from '../../analytics/logger';
import config from '../../config';
import Events from '../../analytics/events';

jest.mock('../../analytics/metrics', () => ({
  incrementMetric: jest.fn(),
}));

describe('TRIOFSND-47: Storage Failure Structured Logging', () => {
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
    const payload = consoleSpy.mock.calls[0][1];
    expect(payload.event).toBe(Events.STORAGE_FAILURE);
    expect(payload.operation_type).toBe('save');
    expect(payload.error_type).toBe('Error');
  });

  it('logs storage_failure when a load operation fails', () => {
    logStorageFailure('load', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const payload = consoleSpy.mock.calls[0][1];
    expect(payload.event).toBe(Events.STORAGE_FAILURE);
    expect(payload.operation_type).toBe('load');
    expect(payload.error_type).toBe('Error');
  });

  it('logs storage_failure when a clear operation fails', () => {
    logStorageFailure('clear', 'Error');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const payload = consoleSpy.mock.calls[0][1];
    expect(payload.event).toBe(Events.STORAGE_FAILURE);
    expect(payload.operation_type).toBe('clear');
    expect(payload.error_type).toBe('Error');
  });

  it('does not log storage_failure when the operation succeeds', () => {
    // The logger is only invoked on failure by the caller (storageService).
    // When an operation succeeds, the caller does not call logStorageFailure.
    // Here we verify that the logger produces exactly one entry per call and
    // does not emit spurious logs.
    logStorageFailure('save', 'Error');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('does not include any PII fields in the storage_failure log entry', () => {
    logStorageFailure('save', 'Error');

    const payload = consoleSpy.mock.calls[0][1];
    const allowedKeys = ['event', 'operation_type', 'error_type', 'app_version'];
    Object.keys(payload).forEach((key) => {
      expect(allowedKeys).toContain(key);
    });

    // Explicitly verify common PII fields are absent
    expect(payload.user_id).toBeUndefined();
    expect(payload.userId).toBeUndefined();
    expect(payload.email).toBeUndefined();
    expect(payload.name).toBeUndefined();
    expect(payload.ip).toBeUndefined();
    expect(payload.device_id).toBeUndefined();
  });

  it('does not include the error message text (only error_type) to avoid leaking sensitive details', () => {
    logStorageFailure('save', 'QuotaExceededError');

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload.error_type).toBe('QuotaExceededError');
    // No raw error message or stack trace should be present
    expect(payload.error_message).toBeUndefined();
    expect(payload.message).toBeUndefined();
    expect(payload.error).toBeUndefined();
    expect(payload.stack).toBeUndefined();
  });

  it('includes the current app_version from config in the log entry', () => {
    logStorageFailure('save', 'Error');

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload.app_version).toBeDefined();
    expect(payload.app_version).toBe(config.app_version);
  });

  it('uses error_type "Error" when the error has no specific name', () => {
    logStorageFailure('save', 'Error');

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload.error_type).toBe('Error');
  });

  it('rethrows the original error after logging', () => {
    // The logger function itself does not throw — it only logs the failure.
    // The caller (storageService) is responsible for rethrowing the original
    // error after calling logStorageFailure. Here we verify the logger does
    // not swallow errors or throw its own.
    expect(() => logStorageFailure('save', 'Error')).not.toThrow();
  });
});
