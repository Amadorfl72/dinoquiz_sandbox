import Events from './events';
import { incrementMetric } from './metrics';

/**
 * Logs a fun_fact_viewed event
 * @param {string} question_id - The ID of the question
 * @param {string} dino_id - The ID of the dinosaur
 * @param {string} app_version - The current app version
 */
export const logFunFactViewed = (question_id, dino_id, app_version) => {
  const payload = {
    event: Events.FUN_FACT_VIEWED,
    question_id,
    dino_id,
    app_version
  };
  
  // Send to analytics service
  console.log('[Analytics]', payload); // Replace with actual analytics service call
  
  // Increment aggregated metric
  incrementMetric('fun_fact_viewed');
};