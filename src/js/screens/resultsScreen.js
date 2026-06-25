/**
 * resultsScreen.js
 * Renders the results screen and handles the 'Volver a jugar' button.
 *
 * TRIOFSND-39: The 'Volver a jugar' handler resets game state, invokes
 * question selection logic, and shows the first question in <2s.
 */

import { GameState } from '../gameState.js';
import { selectQuestions } from '../questionSelector.js';
import { logEvent } from '../analytics.js';
import { renderQuestionScreen } from './questionScreen.js';

/**
 * Motivational messages by score range (AC-8).
 * Ranges: 0-3, 4-6, 7-8, 9-10
 */
const MOTIVATIONAL_MESSAGES = {
  low: '¡Sigue practicando! Los dinosaurios están esperando a que los conozcas mejor.',
  mid: '¡Bien hecho! Sabes bastante sobre dinosaurios.',
  high: '¡Genial! Eres casi un experto en dinosaurios.',
  perfect: '¡Increíble! ¡Eres un verdadero paleontólogo!',
};

/**
 * Returns the motivational message for a given score.
 * @param {number} score
 * @returns {string}
   */
function getMotivationalMessage(score) {
  if (score <= 3) return MOTIVATIONAL_MESSAGES.low;
  if (score <= 6) return MOTIVATIONAL_MESSAGES.mid;
  if (score <= 8) return MOTIVATIONAL_MESSAGES.high;
  return MOTIVATIONAL_MESSAGES.perfect;
}

/**
 * Handles the 'Volver a jugar' button click.
 *
 * Steps:
 * 1. Log replay event (anonymous, aggregated).
 * 2. Reset game state.
 * 3. Select a new random set of 10 questions with shuffled options.
 * 4. Start the new game in GameState.
 * 5. Render the first question immediately.
 *
 * Performance: All operations are local (no network calls), so the
 * transition completes well under 2s. Question selection from a 30-item
 * pool takes <1ms; DOM rendering is the only perceptible cost.
 *
 * @param {Array} questionPool - The full pool of questions for selection.
 * @param {Object} ui - UI helpers for screen transitions.
   */
function handleReplay(questionPool, ui) {
  const replayStartTime = performance.now();

  // 1. Log replay event (anonymous, no PII)
  logEvent('replay_clicked', {
    previous_score: GameState.getScore(),
  });

  try {
    // 2. Reset game state to initial values
    GameState.reset();

    // 3. Select new random question set with shuffled options
    const questions = selectQuestions(questionPool);

    // 4. Start new game session
    GameState.startGame(questions);

    // 5. Render the first question immediately
    renderQuestionScreen(GameState.getCurrentQuestion(), ui);

    // Log game_started for the new session
    logEvent('game_started', {
      is_replay: true,
    });

    const elapsed = performance.now() - replayStartTime;
    console.debug(`[DinoQuiz] Replay transition completed in ${elapsed.toFixed(1)}ms`);
  } catch (error) {
    console.error('[DinoQuiz] Error during replay:', error);
    // Fallback: show start screen if something goes wrong
    ui.showStartScreen();
  }
}

/**
 * Renders the results screen.
 * @param {Object} params
 * @param {number} params.score - Final score (0-10).
 * @param {Array} params.questionPool - Full question pool for replay.
 * @param {Object} params.ui - UI helpers for screen transitions.
   */
function renderResultsScreen({ score, questionPool, ui }) {
  const total = GameState.getTotalQuestions();
  const message = getMotivationalMessage(score);

  // Check for new best score and persist it
  const isNewBest = GameState.saveBestScore(score);
  if (isNewBest) {
    logEvent('best_score_updated', { new_best: score });
  }

  // Log game completion
  const sessionDuration = GameState.get().sessionStartTime
    ? Date.now() - GameState.get().sessionStartTime
    : null;
  logEvent('game_completed', {
    score,
    session_duration_ms: sessionDuration,
  });

  const container = ui.getScreenContainer();
  container.innerHTML = `
    <section class="results-screen" role="region" aria-label="Resultados">
      <div class="results__content">
        <h1 class="results__title">¡Partida terminada!</h1>
        <div class="results__score" aria-live="polite">
          <span class="results__score-number">${score}</span>
          <span class="results__score-total">/${total}</span>
        </div>
        <p class="results__message">${message}</p>
        ${isNewBest ? '<p class="results__new-best">⭐ ¡Nueva mejor puntuación!</p>' : ''}
        <button
          id="btn-replay"
          class="btn btn--primary btn--large"
          type="button"
          aria-label="Volver a jugar"
        >
          🦕 Volver a jugar
        </button>
      </div>
    </section>
  `;

  // Attach the replay handler — TRIOFSND-39
  const replayButton = container.querySelector('#btn-replay');
  replayButton.addEventListener('click', () => {
    // Disable button immediately to prevent double-tap issues
    replayButton.disabled = true;
    replayButton.textContent = 'Cargando...';
    handleReplay(questionPool, ui);
  });
}

export { renderResultsScreen, handleReplay, getMotivationalMessage };
