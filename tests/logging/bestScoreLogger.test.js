const {
  logBestScoreUpdated,
  logStorageFailure,
} = require('../../src/utils/logging');

// Mock console.log to capture structured logs
const mockConsoleLog = jest.fn();
console.log = mockConsoleLog;

describe('TRIOFSND-47: Structured logging for best score and storage events', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
  });

  describe('logBestScoreUpdated', () => {
    it('emits a best_score_updated event with new_best, previous_best, and app_version', () => {
      logBestScoreUpdated(1500, 1200);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);

      expect(logged).toEqual(
        expect.objectContaining({
          event: 'best_score_updated',
          new_best: 1500,
          previous_best: 1200,
          app_version: expect.any(String)
        })
      );
    });

    it('sets previous_best to 0 when there was no previous best', () => {
      logBestScoreUpdated(500, 0);

      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged.previous_best).toBe(0);
      expect(logged.new_best).toBe(500);
    });

    it('does not include any PII fields in the best_score_updated payload', () => {
      logBestScoreUpdated(900, 800);

      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      const piiKeys = ['userId', 'email', 'username', 'name', 'ip', 'device_id'];
      piiKeys.forEach((key) => {
        expect(logged).not.toHaveProperty(key);
      });
    });

    it('only includes the expected top-level keys', () => {
      logBestScoreUpdated(1, 0);

      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'event', 'new_best', 'previous_best', 'timestamp'].sort()
      );
    });
  });

  describe('logStorageFailure', () => {
    it('emits a storage_failure event with operation, error_type, and app_version', () => {
      const error = new Error('Quota exceeded');
      error.name = 'QuotaExceededError';
      logStorageFailure('save', error.name);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);

      expect(logged).toEqual(
        expect.objectContaining({
          event: 'storage_failure',
          operation: 'save',
          error_type: 'QuotaExceededError',
          app_version: expect.any(String),
        })
      );
    });

    it('supports multiple operations (load, save)', () => {
      const operations = ['load', 'save'];
      operations.forEach((operation) => {
        mockConsoleLog.mockClear();
        logStorageFailure(operation, 'Error');
        const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
        expect(logged.operation).toBe(operation);
      });
    });

    it('uses unknown as error_type when error has no name', () => {
      logStorageFailure('load', null);

      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged.error_type).toBe('unknown');
    });

    it('does not include the raw error message or stack trace (potential PII)', () => {
      const error = new Error('Failed for user john@example.com');
      error.stack = 'Error: at /path/to/file.js:10:5';
      logStorageFailure('save', error.name);

      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged).not.toHaveProperty('message');
      expect(logged).not.toHaveProperty('stack');
      expect(logged).not.toHaveProperty('error');
      expect(JSON.stringify(logged)).not.toContain('john@example.com');
    });

    it('only includes the expected top-level keys', () => {
      logStorageFailure('save', 'Error');

      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'error_type', 'event', 'operation', 'timestamp'].sort()
      );
    });

    it('does not include PII fields passed alongside the error', () => {
      logStorageFailure('save', 'Error');

      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged).not.toHaveProperty('userId');
      expect(logged).not.toHaveProperty('email');
    });
  });
});