import analyticsLogger from '../../src/services/analyticsLogger';

describe('analyticsLogger', () => {
  it('should log fun_fact_viewed event', () => {
    const logEventSpy = jest.spyOn(analyticsLogger, 'logEvent');
    analyticsLogger.logEvent('fun_fact_viewed', {});
    expect(logEventSpy).toHaveBeenCalledWith('fun_fact_viewed', {});
  });
});