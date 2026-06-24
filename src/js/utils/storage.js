/**
 * localStorage helpers with graceful degradation.
 * If storage is unavailable or full, the app continues to work without
 * persisting data — no blocking errors are shown to the child.
 */

const BEST_SCORE_KEY = 'dinoquiz_best_score';

/**
 * Safely reads the best score from localStorage.
 * @returns {number} best score or 0 if unavailable
 */
export function getBestScore() {
  try {
    const value = localStorage.getItem(BEST_SCORE_KEY);
    return value ? parseInt(value, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Safely saves the best score to localStorage.
 * @param {number} score
 */
export function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // Storage full or disabled — degrade silently
  }
}
