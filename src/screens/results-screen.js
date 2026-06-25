/**
 * Results screen controller.
 *
 * Handles the end-of-game results screen, including:
 *   - Displaying score and motivational message.
 *   - Best-score persistence in localStorage.
 *   - Wiring the 'Volver a jugar' button to replay telemetry + new game.
 */

import { emit } from '../telemetry/telemetry.js';
import {
  recordGameCompleted,
  recordReplayClicked,
} from '../telemetry/replay-metrics.js';

/**
 * Motivational messages by score range.
 * @type {Object<string, string>}
 */
const MOTIVATIONAL_MESSAGES = {
  low: '¡Sigue practicando, lo estás haciendo genial!', // 0-3
  mid: '¡Muy bien! Ya sabes mucho sobre dinosaurios.', // 4-6
  high: '¡Genial! Eres todo un experto en dinosaurios.', // 7-8
  top: '¡Increíble! ¡Sabes tanto como un paleontólogo!', // 9-10
};

/**
 * Get the motivational message for a given score.
 *
 * @param {number} score - Score from 0 to 10.
 * @returns {string} Motivational message.
 */
export function getMotivationalMessage(score) {
  if (score <= 3) return MOTIVATIONAL_MESSAGES.low;
  if (score <= 6) return MOTIVATIONAL_MESSAGES.mid;
  if (score <= 8) return MOTIVATIONAL_MESSAGES.high;
  return MOTIVATIONAL_MESSAGES.top;
}

/**
 * localStorage key for best score.
 */
const BEST_SCORE_KEY = 'dinoquiz_best_score';

/**
 * Read the persisted best score from localStorage.
 * Returns 0 if storage is unavailable or no score has been saved.
 *
 * @returns {number} Best score (0-10).
 */
export function getBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    // localStorage may be disabled (private mode, quota, etc.)
    return 0;
  }
}

/**
 * Persist the best score if the new score is higher.
 *
 * @param {number} score - Current game score.
 * @returns {boolean} True if a new best score was saved.
 */
function maybeUpdateBestScore(score) {
  try {
    const currentBest = getBestScore();
    if (score > currentBest) {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
      emit('best_score_updated', { best_score: score });
      return true;
    }
  } catch {
    // Silently degrade — never show a blocking error to the child.
  }
  return false;
}

/**
 * Render and show the results screen.
 *
 * @param {Object} params
 * @param {number} params.score - Final score (0-10).
 * @param {HTMLElement} params.container - DOM element to render into.
 * @param {Function} params.onReplay - Callback invoked when 'Volver a jugar' is tapped.
 * @returns {void}
 */
export function showResultsScreen({ score, container, onReplay }) {
  // Record game completion for telemetry (replay-rate calculation).
  recordGameCompleted({ score });

  const isNewBest = maybeUpdateBestScore(score);
  const message = getMotivationalMessage(score);

  container.innerHTML = `
    <div class="results-screen" role="dialog" aria-labelledby="results-title">
      <h1 id="results-title" class="results-title">Has acertado ${score}/10</h1>
      <p class="results-message">${message}</p>
      ${isNewBest ? '<p class="best-score-badge">¡Nueva mejor puntuación!</p>' : ''}
      <button
        id="replay-btn"
        class="btn-primary btn-replay"
        type="button"
        aria-label="Volver a jugar"
      >
        Volver a jugar
      </button>
    </div>
  `;

  const replayBtn = container.querySelector('#replay-btn');
  replayBtn.addEventListener('click', () => {
    // Emit replay_clicked with previous_score and timestamp.
    recordReplayClicked({ previousScore: score });

    // Delegate to the game controller to start a new game.
    if (typeof onReplay === 'function') {
      onReplay();
    }
  });
}
