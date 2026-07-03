import { analyticsLogger } from '../../src/services/analyticsLogger';

describe('TRIOFSND-30: analyticsLogger structured log', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('supports emitting a fun_fact_viewed event payload', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    analyticsLogger.emit({ event: 'fun_fact_viewed' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('fun_fact_viewed')
    );

    consoleSpy.mockRestore();
  });

  it('produces a structured log with event field', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    analyticsLogger.emit({ event: 'fun_fact_viewed' });

    const logged = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(logged);

    expect(parsed).toHaveProperty('event', 'fun_fact_viewed');

    consoleSpy.mockRestore();
  });

  it('does not include PII in the fun_fact_viewed payload', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    analyticsLogger.emit({ event: 'fun_fact_viewed' });

    const logged = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(logged);

    expect(parsed).toEqual({ event: 'fun_fact_viewed' });
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed).not.toHaveProperty('email');
    expect(parsed).not.toHaveProperty('name');

    consoleSpy.mockRestore();
  });
});
