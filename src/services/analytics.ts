import { incrementMetric } from './metrics';

export interface FunFactViewedPayload {
  event: 'fun_fact_viewed';
  question_id: string;
  dino_id: string;
  app_version: string;
}

const APP_VERSION = '1.0.0';

/**
 * Core logging function. In a production environment, this would route to
 * Firebase Analytics, Plausible, or Matomo, respecting age gate restrictions.
 * @param payload The structured event payload.
 */
export function logEvent(payload: Record<string, unknown>): void {
  console.log('[Analytics]', JSON.stringify(payload));
}

/**
 * Logs the 'fun_fact_viewed' event and increments the corresponding metric.
 * 
 * @param question_id The unique identifier of the question.
 * @param dino_id The unique identifier of the dinosaur.
 */
export function logFunFactViewed(question_id: string, dino_id: string): void {
  const payload: FunFactViewedPayload = {
    event: 'fun_fact_viewed',
    question_id,
    dino_id,
    app_version: APP_VERSION,
  };

  logEvent(payload);
  incrementMetric('fun_fact_viewed');
}
