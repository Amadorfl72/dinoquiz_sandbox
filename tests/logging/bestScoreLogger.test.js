const {
  logBestScoreUpdated,
  logStorageFailure,
} = require('../../src/logging/structuredLogger');
const mockLogger = require('../mocks/mockLogger');

jest.mock('../../src/logging/logger', () => mockLogger);

describe('TRIOFSND-47: Structured logging for best score and storage events', () => {
  beforeEach(() => {
    mockLogger.reset();
  });

  describe('logBestScoreUpdated', () => {
    it('emits a best_score_updated event with new_best, previous_best, and app_version', () => {
      logBestScoreUpdated({ newBest: 1500, previousBest: 1200, appVersion: '1.2.3' });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const logged = mockLogger.info.mock.calls[0][0];

      expect(logged).toEqual(
        expect.objectContaining({
          event: 'best_score_updated',
          new_best: 1500,
          previous_best: 1200,
          app_version: '1.2.3',
        })
      );
    });

    it('sets previous_best to null when there was no previous best', () => {
      logBestScoreUpdated({ newBest: 500, previousBest: null, appVersion: '1.0.0' });

      const logged = mockLogger.info.mock.calls[0][0];
      expect(logged.previous_best).toBeNull();
      expect(logged.new_best).toBe(500);
    });

    it('does not include any PII fields in the best_score_updated payload', () => {
      logBestScoreUpdated({
        newBest: 900,
        previousBest: 800,
        appVersion: '2.0.0',
        userId: 'user-123',
        email: 'player@example.com',
        username: 'coolgamer',
      });

      const logged = mockLogger.info.mock.calls[0][0];
      const piiKeys = ['userId', 'email', 'username', 'name', 'ip', 'device_id'];
      piiKeys.forEach((key) => {
        expect(logged).not.toHaveProperty(key);
      });
    });

    it('only includes the expected top-level keys', () => {
      logBestScoreUpdated({ newBest: 1, previousBest: 0, appVersion: '1.0.0' });

      const logged = mockLogger.info.mock.calls[0][0];
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'event', 'new_best', 'previous_best'].sort()
      );
    });

    it('does not log when new_best is not greater than previous_best', () => {
      logBestScoreUpdated({ newBest: 100, previousBest: 200, appVersion: '1.0.0' });
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('logs when new_best equals previous_best (tie is allowed by caller)', () => {
      logBestScoreUpdated({ newBest: 200, previousBest: 200, appVersion: '1.0.0' });
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('logStorageFailure', () => {
    it('emits a storage_failure event with operation, error_type, and app_version', () => {
      const error = new Error('Quota exceeded');
      error.name = 'QuotaExceededError';
      logStorageFailure({ operation: 'save', error, appVersion: '1.2.3' });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const logged = mockLogger.error.mock.calls[0][0];

      expect(logged).toEqual(
        expect.objectContaining({
          event: 'storage_failure',
          operation: 'save',
          error_type: 'QuotaExceededError',
          app_version: '1.2.3',
        })
      );
    });

    it('supports multiple operations (load, save, delete, clear)', () => {
      const operations = ['load', 'save', 'delete', 'clear'];
      operations.forEach((operation) => {
        mockLogger.reset();
        const error = new Error('fail');
        logStorageFailure({ operation, error, appVersion: '1.0.0' });
        const logged = mockLogger.error.mock.calls[0][0];
        expect(logged.operation).toBe(operation);
      });
    });

    it('uses UnknownError as error_type when error has no name', () => {
      const error = { message: 'something broke' };
      logStorageFailure({ operation: 'load', error, appVersion: '1.0.0' });

      const logged = mockLogger.error.mock.calls[0][0];
      expect(logged.error_type).toBe('UnknownError');
    });

    it('does not include the raw error message or stack trace (potential PII)', () => {
      const error = new Error('Failed for user john@example.com');
      error.stack = 'Error: at /path/to/file.js:10:5';
      logStorageFailure({ operation: 'save', error, appVersion: '1.0.0' });

      const logged = mockLogger.error.mock.calls[0][0];
      expect(logged).not.toHaveProperty('message');
      expect(logged).not.toHaveProperty('stack');
      expect(logged).not.toHaveProperty('error');
      expect(JSON.stringify(logged)).not.toContain('john@example.com');
    });

    it('only includes the expected top-level keys', () => {
      const error = new Error('fail');
      logStorageFailure({ operation: 'save', error, appVersion: '1.0.0' });

      const logged = mockLogger.error.mock.calls[0][0];
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'error_type', 'event', 'operation'].sort()
      );
    });

    it('does not include PII fields passed alongside the error', () => {
      const error = new Error('fail');
      logStorageFailure({
        operation: 'save',
        error,
        appVersion: '1.0.0',
        userId: 'user-abc',
        email: 'player@example.com',
      });

      const logged = mockLogger.error.mock.calls[0][0];
      expect(logged).not.toHaveProperty('userId');
      expect(logged).not.toHaveProperty('email');
    });
  });
});
