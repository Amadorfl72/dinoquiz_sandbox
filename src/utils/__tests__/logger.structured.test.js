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
});
