import AnalyticsEvents from './events';

const Logger = {
  logEvent: (event, payload = {}) => {
    if (typeof window.analytics !== 'undefined') {
      window.analytics.logEvent(event, payload);
    }
    console.log(`[Analytics] ${event}`, payload); // For development
  },

  logFunFactViewed: (dinosaurId, factId) => {
    Logger.logEvent(AnalyticsEvents.FUN_FACT_VIEWED, {
      dinosaur_id: dinosaurId,
      fun_fact_id: factId
    });
  }
};

export default Logger;