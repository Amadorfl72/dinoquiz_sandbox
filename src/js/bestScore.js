const BEST_SCORE_KEY = 'dinoquiz_best_score';

/**
 * Obtiene la mejor puntuación guardada en localStorage.
 * Maneja de forma elegante si localStorage está deshabilitado o lleno.
 * @returns {number} La mejor puntuación guardada o 0 si no existe/error.
 */
export function getBestScore() {
  try {
    const score = localStorage.getItem(BEST_SCORE_KEY);
    return score ? parseInt(score, 10) : 0;
  } catch (e) {
    // localStorage might be disabled or full
    return 0;
  }
}

/**
 * Compara la puntuación actual con la guardada en localStorage.
 * Si es mayor, la actualiza.
 * @param {number} currentScore - La puntuación de la partida recién finalizada.
 * @returns {boolean} True si se actualizó la mejor puntuación, false en caso contrario.
 */
export function updateBestScore(currentScore) {
  try {
    const bestScore = getBestScore();
    if (currentScore > bestScore) {
      localStorage.setItem(BEST_SCORE_KEY, currentScore.toString());
      return true; // Indicates a new best score was set
    }
    return false;
  } catch (e) {
    return false;
  }
}
