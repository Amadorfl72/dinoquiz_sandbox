import { logBestScoreUpdated } from '../analytics/logger';

/**
 * Determines the new best score and emits a structured best_score_updated
 * log entry when a new best score is achieved.
 *
 * A new best is achieved when:
 *  - there is no previous best (null/undefined), i.e. the first score, or
 *  - the incoming score is strictly greater than the previous best.
 *
 * The structured log is intentionally PII-free: it only contains the event
 * name, the numeric scores and the app_version (added by the logger).
 *
 * @param {number} newScore - The score just achieved.
 * @param {number|null|undefined} previousBest - The previous best score.
 * @returns {number} The resulting best score.
 */
export const updateBestScore = (newScore, previousBest) => {
  const hasPrevious = previousBest !== null && previousBest !== undefined;

  if (!hasPrevious || newScore > previousBest) {
    logBestScoreUpdated(newScore, hasPrevious ? previousBest : null);
    return newScore;
  }

  return previousBest;
};

export default { updateBestScore };
