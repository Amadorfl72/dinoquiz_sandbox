/**
 * Results screen module.
 * Renders the final results screen and wires the 'Volver a jugar' button.
 */

import { resetGameState, markGameStarted, GameState } from '../game/state.js';
import { selectQuestions } from '../game/questionSelector.js';
import { renderQuestionScreen } from './questionScreen.js';
import { logEvent } from '../utils/metrics.js';
import { getBestScore, saveBestScore } from '../utils/storage.js';
import { strings } from '../i18n/strings.es-ES.js';

/**
 * Motivational messages by score range.
 * Ranges: 0-3, 4-6, 7-8, 9-10
 */
const MOTIVATIONAL_MESSAGES = [
  { min: 0, max: 3, message: strings.results_message_0_3 },
  { min: 4, max: 6, message: strings.results_message_4_6 },
  { min: 7, max: 8, message: strings.results_message_7_8 },
  { min: 9, max: 10, message: strings.results_message_9_10 },
];

/**
 * Returns the motivational message for a given score.
 * @param {number} score
 * @returns {string}
 */
function getMotivationalMessage(score) {
  const entry = MOTIVATIONAL_MESSAGES.find((m) => score >= m.min && score <= m.max);
  return entry ? entry.message : MOTIVATIONAL_MESSAGES[0].message;
}

/**
 * Renders the results screen into the given container.
 *
 * @param {HTMLElement} container - DOM element to render into
 * @param {number} score - final score (0-10)
 * @param {Array<object>} questionPool - full question pool for replay
 * @param {object} [callbacks] - optional callbacks
 * @param {Function} [callbacks.onReplay] - called after replay is triggered
 */
export function renderResultsScreen(container, score, questionPool, callbacks = {}) {
  const message = getMotivationalMessage(score);

  // Persist best score
  const best = getBestScore();
  let newBest = false;
  if (score > best) {
    saveBestScore(score);
    newBest = true;
    logEvent('best_score_updated', { score });
  }

  // Build DOM
  container.innerHTML = `
    <section class="results-screen" role="main" aria-labelledby="results-title">
      <h1 id="results-title" class="results-title">${strings.results_title}</h1>
      <div class="results-score" aria-live="polite">
        ${strings.results_score.replace('{score}', score).replace('{total}', 10)}
      </div>
      ${newBest ? `<div class="results-new-best">${strings.results_new_best}</div>` : ''}
      <p class="results-message">${message}</p>
      <button
        id="replay-btn"
        class="btn btn-primary btn-replay"
        type="button"
        aria-label="${strings.replay_aria}"
      >
        ${strings.replay_button}
      </button>
    </section>
  `;

  // Wire the 'Volver a jugar' button
  const replayBtn = container.querySelector('#replay-btn');
  replayBtn.addEventListener('click', () => {
    handleReplay(container, questionPool, callbacks.onReplay);
  });
}

/**
 * Handles the 'Volver a jugar' click:
 * 1. Resets game state.
 * 2. Selects a new random set of 10 questions with shuffled options.
 * 3. Marks the game as started.
 * 4. Renders the first question immediately.
 *
 * The entire operation is synchronous and lightweight, guaranteeing a
 * response time well under 2s.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} questionPool
 * @param {Function} [onReplay]
 */
function handleReplay(container, questionPool, onReplay) {
  // Log replay event
  logEvent('replay_clicked');

  // 1. Reset game state
  resetGameState();

  // 2. Select new random questions with shuffled options
  GameState.questions = selectQuestions(questionPool);
  GameState.currentIndex = 0;
  GameState.score = 0;

  // 3. Mark game as started
  markGameStarted();
  logEvent('game_started', { source: 'replay' });

  // 4. Render the first question immediately
  renderQuestionScreen(container, GameState.questions, 0, {
    onAnswered: onReplay,
  });

  // Notify external listener if provided
  if (typeof onReplay === 'function') {
    onReplay();
  }
}
