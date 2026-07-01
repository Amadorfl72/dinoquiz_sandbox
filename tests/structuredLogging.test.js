const {
  createLogger,
} = require('../src/logger');

describe('TRIOFSND-47: Structured logging for best score and storage events', () => {
  let transport;
  let logger;

  beforeEach(() => {
    transport = jest.fn();
    logger = createLogger(transport);
  });

  describe('best_score_updated event', () => {
    test('emits structured log with required fields', () => {
      logger.logBestScoreUpdated(120, 100, '1.4.2');
      expect(transport).toHaveBeenCalledTimes(1);
      const payload = transport.mock.calls[0][0];
      expect(payload).toEqual({
        event: 'best_score_updated',
        new_best: 120,
        previous_best: 100,
        app_version: '1.4.2',
      });
    });

    test('previous_best is null when no prior best exists', () => {
      logger.logBestScoreUpdated(50, null, '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(payload.previous_best).toBeNull();
      expect(payload.new_best).toBe(50);
      expect(payload.event).toBe('best_score_updated');
    });

    test('payload is JSON-serializable structured log', () => {
      logger.logBestScoreUpdated(120, 100, '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(() => JSON.stringify(payload)).not.toThrow();
      const parsed = JSON.parse(JSON.stringify(payload));
      expect(parsed.event).toBe('best_score_updated');
      expect(parsed.new_best).toBe(120);
    });

    test('does not include PII fields', () => {
      logger.logBestScoreUpdated(120, 100, '1.4.2');
      const payload = transport.mock.calls[0][0];
      const piiKeys = [
        'username', 'user_id', 'userId', 'email', 'name',
        'ip', 'device_id', 'player_name', 'profile',
      ];
      piiKeys.forEach((key) => {
        expect(payload).not.toHaveProperty(key);
      });
    });

    test('does not emit when new best is not greater than previous best', () => {
      logger.logBestScoreUpdated(90, 100, '1.4.2');
      expect(transport).not.toHaveBeenCalled();
    });

    test('does not emit when new best equals previous best', () => {
      logger.logBestScoreUpdated(100, 100, '1.4.2');
      expect(transport).not.toHaveBeenCalled();
    });

    test('throws on non-numeric score values to prevent malformed logs', () => {
      expect(() => logger.logBestScoreUpdated('120', 100, '1.4.2')).toThrow();
      expect(transport).not.toHaveBeenCalled();
    });
  });

  describe('storage_failure event', () => {
    test('emits structured log with required fields', () => {
      logger.logStorageFailure('save_state', 'QuotaExceededError', '1.4.2');
      expect(transport).toHaveBeenCalledTimes(1);
      const payload = transport.mock.calls[0][0];
      expect(payload).toEqual({
        event: 'storage_failure',
        operation: 'save_state',
        error_type: 'QuotaExceededError',
        app_version: '1.4.2',
      });
    });

    test('payload is JSON-serializable structured log', () => {
      logger.logStorageFailure('save_state', 'QuotaExceededError', '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(() => JSON.stringify(payload)).not.toThrow();
      const parsed = JSON.parse(JSON.stringify(payload));
      expect(parsed.event).toBe('storage_failure');
    });

    test('does not include PII or raw error details', () => {
      logger.logStorageFailure('save_state', 'QuotaExceededError', '1.4.2');
      const payload = transport.mock.calls[0][0];
      const piiKeys = [
        'username', 'user_id', 'userId', 'email', 'name',
        'ip', 'device_id', 'player_name', 'message',
        'stack', 'reason', 'cause',
      ];
      piiKeys.forEach((key) => {
        expect(payload).not.toHaveProperty(key);
      });
    });

    test('normalizes null error_type to a safe label', () => {
      logger.logStorageFailure('save_state', null, '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(payload.error_type).toBe('unknown');
    });

    test('normalizes undefined error_type to a safe label', () => {
      logger.logStorageFailure('save_state', undefined, '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(payload.error_type).toBe('unknown');
    });

    test('truncates overly long operation names to a safe length', () => {
      const longOp = 'x'.repeat(300);
      logger.logStorageFailure(longOp, 'QuotaExceededError', '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(payload.operation.length).toBeLessThanOrEqual(64);
    });

    test('rejects non-string operation to prevent malformed logs', () => {
      expect(() => logger.logStorageFailure(42, 'QuotaExceededError', '1.4.2')).toThrow();
      expect(transport).not.toHaveBeenCalled();
    });
  });

  describe('app_version handling', () => {
    test('includes app_version in every emitted event', () => {
      logger.logBestScoreUpdated(120, 100, '1.4.2');
      logger.logStorageFailure('save_state', 'QuotaExceededError', '1.4.2');
      expect(transport).toHaveBeenCalledTimes(2);
      transport.mock.calls.forEach((call) => {
        expect(call[0]).toHaveProperty('app_version', '1.4.2');
      });
    });

    test('uses default version when none provided', () => {
      logger.logBestScoreUpdated(120, 100);
      const payload = transport.mock.calls[0][0];
      expect(payload.app_version).toEqual(expect.any(String));
      expect(payload.app_version.length).toBeGreaterThan(0);
    });

    test('rejects empty app_version string', () => {
      expect(() => logger.logBestScoreUpdated(120, 100, '')).toThrow();
      expect(transport).not.toHaveBeenCalled();
    });
  });

  describe('event schema integrity', () => {
    test('best_score_updated contains exactly the expected keys', () => {
      logger.logBestScoreUpdated(120, 100, '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(Object.keys(payload).sort()).toEqual(
        ['app_version', 'event', 'new_best', 'previous_best'].sort()
      );
    });

    test('storage_failure contains exactly the expected keys', () => {
      logger.logStorageFailure('save_state', 'QuotaExceededError', '1.4.2');
      const payload = transport.mock.calls[0][0];
      expect(Object.keys(payload).sort()).toEqual(
        ['app_version', 'error_type', 'event', 'operation'].sort()
      );
    });
  });
});
