/**
 * Main app controller.
 * Orchestrates screen transitions: start → question → fun-fact → results → replay.
 */

import { resetGameState, markGameStarted, GameState } from './game/state.js';
import { selectQuestions } from './game/questionSelector.js';
import { renderQuestionScreen } from './screens/questionScreen.js';
import { renderResultsScreen } from './screens/resultsScreen.js';
import { logEvent } from './utils/metrics.js';
import { strings } from './i18n/strings.es-ES.js';

/** @type {Array<object>} the full question pool loaded from JSON */
let questionPool = [];

/**
 * Initialises the app.
 * @param {HTMLElement} container - root DOM element
 * @param {Array<object>} pool - question pool from JSON
 */
export function initApp(container, pool) {
  questionPool = pool;
  renderStartScreen(container);
}

/**
 * Renders the start screen with the '¡Jugar!' button.
 * @param {HTMLElement} container
 */
function renderStartScreen(container) {
  container.innerHTML = `
    <section class="start-screen" role="main" aria-labelledby="start-title">
      <h1 id="start-title" class="start-title">${strings.app_title}</h1>
      <div class="start-dino" aria-hidden="true">🦕</div>
      <button id="play-btn" class="btn btn-primary btn-play" type="button">
        ${strings.play_button}
      </button>
    </section>
  `;

  container.querySelector('#play-btn').addEventListener('click', () => {
    startNewGame(container);
  });
}

/**
 * Starts a new game: resets state, selects questions, renders first question.
 * Used by both the initial '¡Jugar!' button and the 'Volver a jugar' handler.
 * @param {HTMLElement} container
 */
export function startNewGame(container) {
  resetGameState();
  GameState.questions = selectQuestions(questionPool);
  markGameStarted();
  logEvent('game_started', { source: 'play' });
  renderQuestionScreen(container, GameState.questions, 0, {
    questionPool,
  });
}
