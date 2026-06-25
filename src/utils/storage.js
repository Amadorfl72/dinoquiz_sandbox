/**
 * Safe localStorage helpers for DinoQuiz.
 *
 * All access is wrapped in try-catch to gracefully handle:
 * - localStorage disabled (e.g. cookies blocked)
 * - Private / incognito mode quota errors
 * - Safari ITP restrictions
 *
 * Values are validated as finite numbers before being returned.
 */

export const STORAGE_KEYS = Object.freeze({
  BEST_SCORE: 'dinoquiz_best_score',
  MUTE: 'dinoquiz_mute',
  FONT_SIZE: 'dinoquiz_font_size',
  HIGH_CONTRAST: 'dinoquiz_high_contrast',
});

/**
 * Safely read a string value from localStorage.
 * Returns null if storage is unavailable or key is absent.
 *
 * @param {string} key
 * @returns {string | null}
 */
function safeGetItem(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    // localStorage may be disabled, in incognito, or quota exceeded.
    // Degrade gracefully — the app still works, just without persistence.
    return null;
  }
}

/**
 * Safely write a string value to localStorage.
 *
 * @param {string} key
 * @param {string} value
 * @returns {boolean} true if the write succeeded.
 */
function safeSetItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Read and validate the best score from localStorage.
 *
 * Returns 0 when:
 * - There is no stored value (first visit).
 * - The stored value is not a finite number (corrupted / manually tampered).
 * - localStorage is unavailable.
 *
 * @returns {number} A finite integer >= 0.
 */
export function getBestScore() {
  const raw = safeGetItem(STORAGE_KEYS.BEST_SCORE);
  if (raw === null) {
    return 0;
  }
  const parsed = Number(raw);
  // Guard against NaN, Infinity, -Infinity, and non-numeric strings.
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

/**
 * Persist the best score to localStorage.
 *
 * @param {number} score
 * @returns {boolean} true if the write succeeded.
 */
export function setBestScore(score) {
  const safeScore = Number(score);
  if (!Number.isFinite(safeScore) || safeScore < 0) {
    return false;
  }
  return safeSetItem(STORAGE_KEYS.BEST_SCORE, String(Math.floor(safeScore)));
}

/**
 * Determine whether the current score is a new best.
 *
 * A score is considered a "new best" ONLY when it strictly exceeds a
 * previously-stored finite value. On the very first play (no stored value
 * or invalid stored value) the score is saved but we do NOT flag it as a
 * "new best" — there was no previous record to surpass.
 *
 * This function does NOT write to localStorage; the caller should call
 * `setBestScore` afterwards if needed.
 *
 * @param {number} score - The score achieved in the just-finished game.
 * @returns {{ isNewBest: boolean, previousBest: number, shouldUpdate: boolean }}
 */
export function evaluateBestScore(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0) {
    return { isNewBest: false, previousBest: 0, shouldUpdate: false };
  }

  const raw = safeGetItem(STORAGE_KEYS.BEST_SCORE);
  const hasPrevious = raw !== null;

  const parsed = Number(raw);
  const previousBest = hasPrevious && Number.isFinite(parsed) && parsed >= 0
    ? Math.floor(parsed)
    : 0;

  const shouldUpdate = numericScore > previousBest;
  // Only show the "new best score" message when there was a genuine previous
  // record AND the new score strictly exceeds it.
  const isNewBest = shouldUpdate && hasPrevious && Number.isFinite(parsed);

  return { isNewBest, previousBest, shouldUpdate };
}

/**
 * Generic safe getter for boolean-like preferences (mute, high contrast).
 *
 * @param {string} key
 * @returns {boolean | null} null if unset.
 */
export function getBooleanPref(key) {
  const raw = safeGetItem(key);
  if (raw === null) return null;
  return raw === 'true';
}

/**
 * Generic safe setter for boolean-like preferences.
 *
 * @param {string} key
 * @param {boolean} value
 * @returns {boolean}
 */
export function setBooleanPref(key, value) {
  return safeSetItem(key, value ? 'true' : 'false');
}
