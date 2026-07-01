import AnalyticsEvents from './events';

class AnalyticsService {
  constructor() {
    // Initialize analytics service
  }

  logEvent(event, params = {}) {
    // Implementation to log event to analytics backend
    console.log(`Logging event: ${event}`, params);
    // Actual implementation would send to Firebase/Plausible/etc.
  }

  logFunFactViewed(dinosaurId, factId) {
    this.logEvent(AnalyticsEvents.FUN_FACT_VIEWED, {
      dinosaur_id: dinosaurId,
      fact_id: factId
    });
  }
}

export default new AnalyticsService();