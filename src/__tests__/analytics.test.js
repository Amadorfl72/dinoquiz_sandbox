import AnalyticsService from '../analytics/service';
import AnalyticsEvents from '../analytics/events';

// Mock the console.log to verify calls
console.log = jest.fn();

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log fun_fact_viewed event with correct parameters', () => {
    const dinosaurId = 'trex';
    const factId = 'fact123';
    
    AnalyticsService.logFunFactViewed(dinosaurId, factId);
    
    expect(console.log).toHaveBeenCalledWith(
      'Logging event: fun_fact_viewed', 
      { dinosaur_id: dinosaurId, fact_id: factId }
    );
  });
});