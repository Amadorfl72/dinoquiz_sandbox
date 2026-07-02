import { logFunFactViewed } from '../../src/analytics/logger';
import Events from '../../src/analytics/events';
import { incrementMetric } from '../../src/analytics/metrics';

jest.mock('../../src/analytics/metrics');

describe('analyticsLogger structured log', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('supports emitting a fun_fact_viewed event payload', () => {
    logFunFactViewed('q1', 'stegosaurus', '1.0.0');

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Analytics]',
      expect.objectContaining({
        event: 'fun_fact_viewed',
        question_id: 'q1',
        dino_id: 'stegosaurus',
        app_version: '1.0.0',
      })
    );
  });

  it('produces a structured log with event field', () => {
    logFunFactViewed('q2', 'trex', '2.1.0');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = consoleSpy.mock.calls[0][1];
    expect(loggedPayload).toHaveProperty('event');
    expect(loggedPayload.event).toBe(Events.FUN_FACT_VIEWED);
    expect(loggedPayload.event).toBe('fun_fact_viewed');
  });

  it('increments the fun_fact_viewed metric when logging', () => {
    logFunFactViewed('q1', 'stegosaurus', '1.0.0');

    expect(incrementMetric).toHaveBeenCalledWith('fun_fact_viewed');
  });

  it('includes all required fields in the structured payload', () => {
    logFunFactViewed('q3', 'brachiosaurus', '3.0.0');

    const payload = consoleSpy.mock.calls[0][1];
    expect(payload).toEqual({
      event: 'fun_fact_viewed',
      question_id: 'q3',
      dino_id: 'brachiosaurus',
      app_version: '3.0.0',
    });
  });
});
