const { updateBestScore } = require('../../src/scoreManager');
const logger = require('../../src/logger');

jest.mock('../../src/logger');

const APP_VERSION = '1.2.3';

describe('TRIOFSND-47: Structured logging for storage failures', () => {
  let storageMock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits storage_failure with operation, error_type, and app_version when storage read fails', async () => {
    const readError = new Error('disk read failed');
    readError.code = 'EIO';
    storageMock = {
      getBestScore: jest.fn().mockRejectedValue(readError),
      setBestScore: jest.fn(),
    };

    await expect(
      updateBestScore(50, { storage: storageMock, appVersion: APP_VERSION })
    ).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledWith({
      event: 'storage_failure',
      operation: 'getBestScore',
      error_type: 'EIO',
      app_version: APP_VERSION,
    });
  });

  it('emits storage_failure when storage write fails', async () => {
    storageMock = {
      getBestScore: jest.fn().mockResolvedValue(10),
      setBestScore: jest.fn().mockRejectedValue(new TypeError('cannot write')),
    };

    await expect(
      updateBestScore(30, { storage: storageMock, appVersion: APP_VERSION })
    ).rejects.toThrow();

    expect(logger.error).toHaveBeenCalledWith({
      event: 'storage_failure',
      operation: 'setBestScore',
      error_type: 'TypeError',
      app_version: APP_VERSION,
    });
  });

  it('uses the error constructor name as error_type when no code is present', async () => {
    storageMock = {
      getBestScore: jest.fn().mockResolvedValue(0),
      setBestScore: jest.fn().mockRejectedValue(new RangeError('out of range')),
    };

    await expect(
      updateBestScore(5, { storage: storageMock, appVersion: APP_VERSION })
    ).rejects.toThrow();

    const [logEntry] = logger.error.mock.calls.find(
      ([entry]) => entry.event === 'storage_failure'
    );
    expect(logEntry.error_type).toBe('RangeError');
  });

  it('does not include PII or raw error messages in the storage_failure log entry', async () => {
    const error = new Error('failed for user user-123');
    error.code = 'EACCES';
    storageMock = {
      getBestScore: jest.fn().mockRejectedValue(error),
      setBestScore: jest.fn(),
    };

    await expect(
      updateBestScore(1, {
        storage: storageMock,
        appVersion: APP_VERSION,
        userId: 'user-123',
        username: 'jane.doe@example.com',
      })
    ).rejects.toThrow();

    const [logEntry] = logger.error.mock.calls.find(
      ([entry]) => entry.event === 'storage_failure'
    );

    expect(logEntry).not.toHaveProperty('userId');
    expect(logEntry).not.toHaveProperty('username');
    expect(logEntry).not.toHaveProperty('message');
    expect(logEntry).not.toHaveProperty('stack');
    expect(JSON.stringify(logEntry)).not.toContain('user-123');
    expect(JSON.stringify(logEntry)).not.toContain('jane.doe');
  });

  it('does not emit storage_failure when storage operations succeed', async () => {
    storageMock = {
      getBestScore: jest.fn().mockResolvedValue(40),
      setBestScore: jest.fn().mockResolvedValue(true),
    };

    await updateBestScore(60, { storage: storageMock, appVersion: APP_VERSION });

    const failureLogs = logger.error.mock.calls.filter(
      ([entry]) => entry && entry.event === 'storage_failure'
    );
    expect(failureLogs).toHaveLength(0);
  });
});
