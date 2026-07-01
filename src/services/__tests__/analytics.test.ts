import { logFunFactViewed } from '../analytics';
import { getMetric } from '../metrics';

describe('Analytics - fun_fact_viewed', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log the structured payload and increment the metric', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    logFunFactViewed('q_123', 't_rex');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Analytics]',
      JSON.stringify({
        event: 'fun_fact_viewed',
        question_id: 'q_123',
        dino_id: 't_rex',
        app_version: '1.0.0',
      })
    );
    
    expect(getMetric('fun_fact_viewed')).toBe(1);
  });
});