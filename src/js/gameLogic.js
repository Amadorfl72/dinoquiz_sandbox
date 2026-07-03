const BEST_SCORE_KEY = 'bestScore';

/**
 * Finaliza la partida: compara la puntuación actual con la mejor guardada en
 * localStorage. Si es mayor (o no existía una previa), la actualiza y muestra el
 * mensaje de nueva mejor puntuación. En caso contrario, omite el mensaje.
 *
 * @param {number} currentScore - Puntuación de la partida recién terminada.
 * @returns {{ isNewBestScore: boolean, bestScore: number }}
 */
function endGame(currentScore) {
  // No actualizar con puntuaciones negativas
  if (currentScore < 0) {
    const bestScore = getBestScore();
    return { isNewBestScore: false, bestScore };
  }

  const stored = localStorage.getItem(BEST_SCORE_KEY);
  const hasPreviousScore = stored !== null;
  const bestScore = getBestScore();

  const isNewBestScore = !hasPreviousScore || currentScore > bestScore;

  if (isNewBestScore) {
    localStorage.setItem(BEST_SCORE_KEY, currentScore.toString());
    showNewBestScoreMessage();
    return { isNewBestScore: true, bestScore: currentScore };
  }

  return { isNewBestScore: false, bestScore };
}

/**
 * Alias semántico de endGame para el flujo de fin de partida.
 * @param {number} currentScore
 */
function handleGameEnd(currentScore) {
  return endGame(currentScore);
}

/**
 * Devuelve la mejor puntuación histórica guardada en localStorage.
 * @returns {number}
 */
function getBestScore() {
  const stored = localStorage.getItem(BEST_SCORE_KEY);
  if (stored === null) {
    return 0;
  }
  
  const parsed = parseInt(stored, 10);
  // Devolver 0 si el valor no es numérico
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Muestra el mensaje de nueva mejor puntuación si el elemento existe en el DOM.
 */
function showNewBestScoreMessage() {
  const messageElement =
    (typeof document !== 'undefined' &&
      (document.getElementById('new-best-score-message') ||
        document.getElementById('best-score-message'))) ||
    null;

  if (messageElement) {
    messageElement.style.display = 'block';
    setTimeout(() => {
      messageElement.style.display = 'none';
    }, 3000);
  }
}

// Alias mantenido por compatibilidad con el nombre anterior.
const showNewHighScoreMessage = showNewBestScoreMessage;

module.exports = {
  endGame,
  handleGameEnd,
  getBestScore,
  showNewBestScoreMessage,
  showNewHighScoreMessage,
};