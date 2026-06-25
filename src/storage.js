const BEST_SCORE_KEY = 'dinoquiz_best_score';

/**
 * Retrieves the best score from localStorage.
 * Handles potential localStorage errors gracefully.
 * @returns {number} The best score, or 0 if none exists or an error occurs.
 */
export function getBestScore() {
  try {
    const score = localStorage.getItem(BEST_SCORE_KEY);
    return score ? parseInt(score, 10) : 0;
  } catch (e) {
    // localStorage might be disabled, full, or in private mode
    return 0;
  }
}

/**
 * Saves the best score to localStorage.
 * @param {number} score - The score to save.
 * @returns {boolean} True if saved successfully, false otherwise.
 */
export function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, score.toString());
    return true;
  } catch (e) {
    return false;
  }
}
