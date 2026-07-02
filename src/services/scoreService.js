import { getAppVersion } from '../config';

/**
 * Checks if the new score is a best score and logs a structured event if so.
 * @param {number} newScore - The new score achieved.
 * @param {number|null} previousBest - The previous best score, or null if none.
 * @returns {boolean} True if the new score is a new best, false otherwise.
 */
export const updateBestScore = (newScore, previousBest) => {
  if (previousBest === null || newScore > previousBest) {
    console.log('best_score_updated', {
      event: 'best_score_updated',
      new_score: newScore,
      previous_best: previousBest,
      app_version: getAppVersion(),
    });
    return true;
  }
  return false;
};
