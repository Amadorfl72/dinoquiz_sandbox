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

  it('should throw error when question_id is missing', () => {
    expect(() => logFunFactViewed('', 't_rex')).toThrow('question_id and dino_id are required');
    expect(() => logFunFactViewed(null as any, 't_rex')).toThrow('question_id and dino_id are required');
  });

  it('should throw error when dino_id is missing', () => {
    expect(() => logFunFactViewed('q_123', '')).toThrow('question_id and dino_id are required');
    expect(() => logFunFactViewed('q_123', null as any)).toThrow('question_id and dino_id are required');
  });
});
