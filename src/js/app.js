/**
 * app.js
 * Main application controller for DinoQuiz.
 * Wires together game state, question selection, screen rendering, and UI.
 */

import { GameState } from './gameState.js';
import { selectQuestions } from './questionSelector.js';
import { renderQuestionScreen } from './screens/questionScreen.js';
import { renderResultsScreen } from './screens/resultsScreen.js';
import { logEvent } from './analytics.js';

/**
 * UI helper object providing screen transitions and asset access.
   */
const ui = {
  _container: document.getElementById('app'),
  _sounds: {},
  _muted: false,

  getScreenContainer() {
    return this._container;
  },

  getAssetUrl(path) {
    return `./assets/${path}`;
  },

  playSound(name) {
    if (this._muted) return;
    const sound = this._sounds[name];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  },

  setMuted(muted) {
    this._muted = muted;
    try {
      localStorage.setItem('dinoquiz_muted', String(muted));
    } catch (e) {
      // Ignore storage errors
    }
  },

  loadMuteState() {
    try {
      this._muted = localStorage.getItem('dinoquiz_muted') === 'true';
    } catch (e) {
      this._muted = false;
    }
  },

  showStartScreen() {
    // Delegate to start screen module (not part of this ticket)
    this._container.innerHTML = `
      <section class="start-screen">
        <h1>DinoQuiz</h1>
        <button id="btn-start" class="btn btn--primary btn--large">¡Jugar!</button>
      </section>
    `;
    const startBtn = this._container.querySelector('#btn-start');
    startBtn?.addEventListener('click', () => startNewGame());
  },

  showFunFactScreen(question, isCorrect) {
    // Delegate to fun fact screen module (not part of this ticket)
    // For now, advance to next question or results
    const phase = GameState.nextQuestion();
    if (phase === 'results') {
      renderResultsScreen({
        score: GameState.getScore(),
        questionPool: window.__DINOQUIZ_QUESTIONS__,
        ui: this,
      });
    } else {
      renderQuestionScreen(GameState.getCurrentQuestion(), this);
    }
  },
};

/**
 * The full question pool loaded from local JSON.
   */
let questionPool = [];

/**
 * Starts a new game: selects questions, initializes state, renders first question.
   */
function startNewGame() {
  const questions = selectQuestions(questionPool);
  GameState.startGame(questions);
  logEvent('game_started', { is_replay: false });
  renderQuestionScreen(GameState.getCurrentQuestion(), ui);
}

/**
 * Initializes the application.
   */
async function init() {
  ui.loadMuteState();

  // Load question pool from local JSON (cached by Service Worker for offline)
  try {
    const response = await fetch('./data/questions.json');
    questionPool = await response.json();
    window.__DINOQUIZ_QUESTIONS__ = questionPool;
  } catch (e) {
    console.error('[DinoQuiz] Failed to load questions:', e);
    ui.getScreenContainer().innerHTML = `
      <section class="error-screen">
        <p>Conéctate la primera vez para descargar el juego.</p>
      </section>
    `;
    return;
  }

  // Always show start screen on app load — no partial game restoration (AC-18)
  GameState.reset();
  ui.showStartScreen();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, startNewGame, ui };
