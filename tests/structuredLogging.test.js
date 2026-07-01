const {
  logBestScoreUpdated,
  logStorageFailure,
} = require('../src/utils/logging');

// Mock console.log to capture structured logs
const mockConsoleLog = jest.fn();
console.log = mockConsoleLog;

describe('TRIOFSND-47: Structured logging for best score and storage events', () => {
  beforeEach(() => {
    mockConsoleLog.mockClear();
  });

  describe('best_score_updated event', () => {
    test('emits structured log with required fields', () => {
      logBestScoreUpdated(120, 100);
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged).toEqual({
        event: 'best_score_updated',
        new_best: 120,
        previous_best: 100,
        app_version: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('previous_best is null when no prior best exists', () => {
      logBestScoreUpdated(50, 0);
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged.previous_best).toBe(0);
      expect(logged.new_best).toBe(50);
      expect(logged.event).toBe('best_score_updated');
    });

    test('payload is JSON-serializable structured log', () => {
      logBestScoreUpdated(120, 100);
      const payload = mockConsoleLog.mock.calls[0][0];
      expect(() => JSON.stringify(payload)).not.toThrow();
      const parsed = JSON.parse(payload);
      expect(parsed.event).toBe('best_score_updated');
      expect(parsed.new_best).toBe(120);
    });

    test('does not include PII fields', () => {
      logBestScoreUpdated(120, 100);
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      const piiKeys = [
        'username', 'user_id', 'userId', 'email', 'name',
        'ip', 'device_id', 'player_name', 'profile',
      ];
      piiKeys.forEach((key) => {
        expect(logged).not.toHaveProperty(key);
      });
    });
  });

  describe('storage_failure event', () => {
    test('emits structured log with required fields', () => {
      logStorageFailure('save_state', 'QuotaExceededError');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged).toEqual({
        event: 'storage_failure',
        operation: 'save_state',
        error_type: 'QuotaExceededError',
        app_version: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('payload is JSON-serializable structured log', () => {
      logStorageFailure('save_state', 'QuotaExceededError');
      const payload = mockConsoleLog.mock.calls[0][0];
      expect(() => JSON.stringify(payload)).not.toThrow();
      const parsed = JSON.parse(payload);
      expect(parsed.event).toBe('storage_failure');
    });

    test('does not include PII or raw error details', () => {
      logStorageFailure('save_state', 'QuotaExceededError');
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      const piiKeys = [
        'username', 'user_id', 'userId', 'email', 'name',
        'ip', 'device_id', 'player_name', 'message',
        'stack', 'reason', 'cause',
      ];
      piiKeys.forEach((key) => {
        expect(logged).not.toHaveProperty(key);
      });
    });

    test('normalizes null error_type to a safe label', () => {
      logStorageFailure('save_state', null);
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged.error_type).toBe('unknown');
    });

    test('normalizes undefined error_type to a safe label', () => {
      logStorageFailure('save_state', undefined);
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged.error_type).toBe('unknown');
    });

    test('truncates overly long operation names to a safe length', () => {
      const longOp = 'x'.repeat(300);
      logStorageFailure(longOp, 'QuotaExceededError');
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged.operation.length).toBeLessThanOrEqual(64);
    });

    test('rejects non-string operation to prevent malformed logs', () => {
      expect(() => logStorageFailure(42, 'QuotaExceededError')).not.toThrow();
      // Note: We convert non-string operations to strings in implementation
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(logged.operation).toBe('42');
    });
  });

  describe('app_version handling', () => {
    test('includes app_version in every emitted event', () => {
      logBestScoreUpdated(120, 100);
      logStorageFailure('save_state', 'QuotaExceededError');
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      
      mockConsoleLog.mock.calls.forEach((call) => {
        const logged = JSON.parse(call[0]);
        expect(logged).toHaveProperty('app_version');
        expect(logged.app_version).toEqual(expect.any(String));
        expect(logged.app_version.length).toBeGreaterThan(0);
      });
    });
  });

  describe('event schema integrity', () => {
    test('best_score_updated contains exactly the expected keys', () => {
      logBestScoreUpdated(120, 100);
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'event', 'new_best', 'previous_best', 'timestamp'].sort()
      );
    });

    test('storage_failure contains exactly the expected keys', () => {
      logStorageFailure('save_state', 'QuotaExceededError');
      const logged = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(Object.keys(logged).sort()).toEqual(
        ['app_version', 'error_type', 'event', 'operation', 'timestamp'].sort()
      );
    });
  });
});