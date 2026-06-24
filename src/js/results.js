import { updateBestScore, getBestScore } from './bestScore.js';

/**
 * Renderiza la pantalla de resultados al finalizar la partida.
 * Compara la puntuación actual con la mejor puntuación y muestra el mensaje correspondiente.
 * @param {number} score - Puntuación actual de la partida.
 * @param {number} totalQuestions - Número total de preguntas (10).
 * @param {Function} onReplay - Callback al pulsar 'Volver a jugar'.
 * @returns {HTMLElement} El contenedor de la pantalla de resultados.
 */
export function renderResults(score, totalQuestions, onReplay) {
  const isNewBestScore = updateBestScore(score);
  const bestScore = getBestScore();

  const container = document.createElement('div');
  container.className = 'results-container';

  let motivationalMessage = '';
  if (score <= 3) {
    motivationalMessage = '¡Buen intento! Sigue practicando.';
  } else if (score <= 6) {
    motivationalMessage = '¡Muy bien! Sabes mucho de dinosaurios.';
  } else if (score <= 8) {
    motivationalMessage = '¡Excelente! Eres un experto.';
  } else {
    motivationalMessage = '¡Increíble! Eres un verdadero paleontólogo.';
  }

  container.innerHTML = `
    <h2 class="results-score">Has acertado ${score}/${totalQuestions}</h2>
    <p class="results-message">${motivationalMessage}</p>
    ${isNewBestScore ? '<p class="new-best-score">¡Nueva mejor puntuación!</p>' : ''}
    <p class="best-score-display">Tu mejor puntuación: ${bestScore}/${totalQuestions}</p>
    <button class="btn-replay">Volver a jugar</button>
  `;

  container.querySelector('.btn-replay').addEventListener('click', onReplay);

  return container;
}
