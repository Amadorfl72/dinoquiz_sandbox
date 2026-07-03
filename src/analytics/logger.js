import Events from './events';
import { incrementMetric } from './metrics';
import config from '../config';

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

  console.log('[Analytics]', payload);
  incrementMetric('fun_fact_viewed');
};

/**
 * Logs a best_score_updated event.
 *
 * The payload is intentionally free of PII. It only contains:
 *  - event name
 *  - new_score (numeric)
 *  - previous_best (numeric or null)
 *  - app_version (from config)
 *
 * Emits exactly one structured log entry per call.
 *
 * @param {number} new_score - The new best score
 * @param {number|null} previous_best - The previous best score (null if first score)
 */
export const logBestScoreUpdated = (new_score, previous_best) => {
  const payload = {
    event: Events.BEST_SCORE_UPDATED,
    new_score,
    previous_best: previous_best === undefined ? null : previous_best,
    app_version: config.app_version
  };

  console.log('[Analytics]', payload);
  incrementMetric('best_score_updated');
};

/**
 * Logs a storage_failure event.
 *
 * The payload deliberately avoids any PII and does NOT include the error
 * message text (which could leak sensitive details) — only the error_type.
 *
 * @param {string} operation_type - The storage operation that failed (save/load/clear)
 * @param {string} error_type - The type of error (e.g. 'Error', 'QuotaExceededError')
 */
export const logStorageFailure = (operation_type, error_type) => {
  const payload = {
    event: Events.STORAGE_FAILURE,
    operation_type,
    error_type: error_type || 'Error',
    app_version: config.app_version
  };

  console.log('[Analytics]', payload);
  incrementMetric('storage_failure');
};
