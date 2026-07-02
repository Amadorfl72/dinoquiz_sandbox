import { logFunFactViewed } from '../src/analytics/logger';
import { incrementMetric } from '../src/analytics/metrics';
import Events from '../src/analytics/events';

jest.mock('../src/analytics/metrics');

describe('logFunFactViewed', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('logs correct payload with event fun_fact_viewed', () => {
    const question_id = 'q123';
    const dino_id = 'd456';
    const app_version = '1.0.0';

    logFunFactViewed(question_id, dino_id, app_version);

    const expectedPayload = {
      event: Events.FUN_FACT_VIEWED,
      question_id,
      dino_id,
      app_version
    };

    expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expectedPayload);
    expect(expectedPayload.event).toBe('fun_fact_viewed');
  });

  test('increments fun_fact_viewed metric', () => {
    logFunFactViewed('q1', 'd1', 'v1');

    expect(incrementMetric).toHaveBeenCalledTimes(1);
    expect(incrementMetric).toHaveBeenCalledWith('fun_fact_viewed');
  });

  test('handles null/undefined values gracefully', () => {
    logFunFactViewed(null, null, null);

    const expectedPayload = {
      event: 'fun_fact_viewed',
      question_id: null,
      dino_id: null,
      app_version: null
    };

    expect(consoleSpy).toHaveBeenCalledWith('[Analytics]', expectedPayload);
    expect(incrementMetric).toHaveBeenCalledWith('fun_fact_viewed');
  });

  test('uses Events.FUN_FACT_VIEWED constant for event name', () => {
    logFunFactViewed('q2', 'd2', '2.0.0');

    const callArgs = consoleSpy.mock.calls[0];
    expect(callArgs[1].event).toBe(Events.FUN_FACT_VIEWED);
  });
});

describe('incrementMetric', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('increments the specified metric', () => {
    const { incrementMetric } = require('../src/analytics/metrics');

    incrementMetric('fun_fact_viewed');

    expect(consoleSpy).toHaveBeenCalledWith('[Metrics] fun_fact_viewed: 1');
  });

  test('accumulates multiple increments for same metric', () => {
    const { incrementMetric } = require('../src/analytics/metrics');

    incrementMetric('fun_fact_viewed');
    incrementMetric('fun_fact_viewed');
    incrementMetric('fun_fact_viewed');

    expect(consoleSpy).toHaveBeenLastCalledWith('[Metrics] fun_fact_viewed: 3');
  });
});
