const logger = require('../logger');

describe('TRIOFSND-47: logger.logStructured contract', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('serializes the structured payload as a JSON string', () => {
    const payload = {
      event: 'best_score_updated',
      new_best: 1500,
      previous_best: 1200,
      app_version: '1.4.2',
    };

    logger.logStructured(payload);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = consoleSpy.mock.calls[0][0];
    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toEqual(payload);
  });

  it('serializes storage_failure payloads correctly', () => {
    const payload = {
      event: 'storage_failure',
      operation: 'save',
      error_type: 'QuotaExceededError',
      app_version: '1.4.2',
    };

    logger.logStructured(payload);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = consoleSpy.mock.calls[0][0];
    expect(JSON.parse(output)).toEqual(payload);
  });

  it('does not include any extra metadata beyond the provided payload', () => {
    const payload = {
      event: 'best_score_updated',
      new_best: 1500,
      previous_best: 1200,
      app_version: '1.4.2',
    };

    logger.logStructured(payload);

    const output = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(Object.keys(parsed).sort()).toEqual(
      ['app_version', 'event', 'new_best', 'previous_best'].sort()
    );
  });

  it('logBestScoreUpdated emits the correct structured payload', () => {
    logger.logBestScoreUpdated(1500, 1200, '1.4.2');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      event: 'best_score_updated',
      new_best: 1500,
      previous_best: 1200,
      app_version: '1.4.2',
    });
  });

  it('logStorageFailure emits the correct structured payload', () => {
    logger.logStorageFailure('save', 'QuotaExceededError', '1.4.2');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const output = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      event: 'storage_failure',
      operation: 'save',
      error_type: 'QuotaExceededError',
      app_version: '1.4.2',
    });
  });

  it('logBestScoreUpdated handles null previous_best', () => {
    logger.logBestScoreUpdated(500, null, '1.4.2');

    const output = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      event: 'best_score_updated',
      new_best: 500,
      previous_best: null,
      app_version: '1.4.2',
    });
  });

  it('logStorageFailure handles undefined error_type gracefully', () => {
    logger.logStorageFailure('save', undefined, '1.4.2');

    const output = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      event: 'storage_failure',
      operation: 'save',
      error_type: undefined,
      app_version: '1.4.2',
    });
  });

  it('logBestScoreUpdated does not include any PII fields', () => {
    logger.logBestScoreUpdated(1500, 1200, '1.4.2');

    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    const piiFields = ['userId', 'user_id', 'username', 'email', 'ip', 'device_id', 'name', 'phone'];

    piiFields.forEach((field) => {
      expect(parsed).not.toHaveProperty(field);
    });
    expect(Object.keys(parsed).sort()).toEqual(
      ['app_version', 'event', 'new_best', 'previous_best'].sort()
    );
  });

  it('logStorageFailure does not include any PII fields', () => {
    logger.logStorageFailure('save', 'QuotaExceededError', '1.4.2');

    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    const piiFields = ['userId', 'user_id', 'username', 'email', 'ip', 'device_id', 'name', 'phone', 'payload', 'data', 'error_message', 'message', 'stack'];

    piiFields.forEach((field) => {
      expect(parsed).not.toHaveProperty(field);
    });
    expect(Object.keys(parsed).sort()).toEqual(
      ['app_version', 'error_type', 'event', 'operation'].sort()
    );
  });
});
