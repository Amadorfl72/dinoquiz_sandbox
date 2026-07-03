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
  const stored = localStorage.getItem(BEST_SCORE_KEY);
  const hasPreviousScore = stored !== null;
  const bestScore = parseInt(stored || '0', 10);

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
  return parseInt(localStorage.getItem(BEST_SCORE_KEY) || '0', 10);
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
