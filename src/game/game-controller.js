/**
 * Game controller — orchestrates the DinoQuiz game flow.
 *
 * Integrates replay telemetry at the two key points:
 *   1. When a game starts (game_started with trigger 'initial' or 'replay').
 *   2. When the results screen calls onReplay (which triggers a new game
 *      with trigger 'replay').
 */

import { recordGameStarted } from '../telemetry/replay-metrics.js';
import { showResultsScreen } from '../screens/results-screen.js';

/**
 * @typedef {Object} Question
 * @property {string} id - Question identifier.
 * @property {string} prompt - Question text.
 * @property {string[]} options - Array of 3 answer options.
 * @property {number} correctIndex - Index of the correct option.
 * @property {string} dinosaurId - Dinosaur identifier.
 * @property {string} funFact - Short fun fact text.
 * @property {string} image - Image URL or path.
 */

/**
 * Shuffle an array (Fisher-Yates). Returns a new array.
 *
 * @param {Array} arr
 * @returns {Array}
 */
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Select 10 random questions from the pool without repetition.
 *
 * @param {Question[]} pool - Full question pool (≥10 items).
 * @returns {Question[]} Array of 10 questions.
 */
export function selectQuestions(pool) {
  return shuffle(pool).slice(0, 10);
}

/**
 * GameController manages a single game session lifecycle.
 */
export class GameController {
  /**
   * @param {Object} params
   * @param {Question[]} params.questionPool - Full pool of questions.
   * @param {HTMLElement} params.container - DOM container for rendering.
   */
  constructor({ questionPool, container }) {
    this.questionPool = questionPool;
    this.container = container;
    this.currentQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.trigger = 'initial';
  }

  /**
   * Start a new game.
   *
   * @param {Object} [options]
   * @param {'initial'|'replay'} [options.trigger='initial'] - What triggered this game.
   * @returns {void}
   */
  startGame({ trigger = 'initial' } = {}) {
    this.trigger = trigger;
    this.currentQuestions = selectQuestions(this.questionPool);
    this.currentIndex = 0;
    this.score = 0;

    // Emit game_started with trigger ('initial' or 'replay').
    recordGameStarted({ trigger });

    this._renderCurrentQuestion();
  }

  /**
   * Handle the user's answer to the current question.
   *
   * @param {number} selectedOption - Index of the selected option.
   * @returns {void}
   */
  answerQuestion(selectedOption) {
    const question = this.currentQuestions[this.currentIndex];
    const isCorrect = selectedOption === question.correctIndex;

    if (isCorrect) {
      this.score += 1;
    }

    emit('question_answered', { is_correct: isCorrect });

    this._showFunFact(question, isCorrect);
  }

  /**
   * Advance to the next question or show results if game is over.
   *
   * @returns {void}
   */
  next() {
    this.currentIndex += 1;

    if (this.currentIndex >= this.currentQuestions.length) {
      this._showResults();
    } else {
      this._renderCurrentQuestion();
    }
  }

  /**
   * Show the results screen and wire the replay button.
   *
   * @private
   * @returns {void}
   */
  _showResults() {
    showResultsScreen({
      score: this.score,
      container: this.container,
      onReplay: () => {
        // Start a new game triggered by replay.
        this.startGame({ trigger: 'replay' });
      },
    });
  }

  /**
   * Render the current question.
   *
   * @private
   * @returns {void}
   */
  _renderCurrentQuestion() {
    const question = this.currentQuestions[this.currentIndex];
    const shuffledOptions = shuffle(
      question.options.map((text, originalIndex) => ({
        text,
        originalIndex,
      })),
    );

    this.container.innerHTML = `
      <div class="question-screen">
        <img src="${question.image}" alt="${question.dinosaurId}" class="dino-image" />
        <h2 class="question-prompt">${question.prompt}</h2>
        <div class="options">
          ${shuffledOptions
            .map(
              (opt, i) => `
            <button class="btn-option" data-option-index="${i}" data-original-index="${opt.originalIndex}" type="button">
              ${opt.text}
            </button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.btn-option').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const originalIndex = parseInt(
          e.currentTarget.dataset.originalIndex,
          10,
        );
        this.answerQuestion(originalIndex);
      });
    });
  }

  /**
   * Show the fun fact screen after answering.
   *
   * @private
   * @param {Question} question
   * @param {boolean} isCorrect
   * @returns {void}
   */
  _showFunFact(question, isCorrect) {
    this.container.innerHTML = `
      <div class="funfact-screen">
        <p class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
          ${isCorrect ? '¡Correcto!' : 'La respuesta correcta era otra, ¡no pasa nada!'}
        </p>
        <img src="${question.image}" alt="${question.dinosaurId}" class="dino-image" />
        <p class="funfact-text">${question.funFact}</p>
        <button id="next-btn" class="btn-primary" type="button">Siguiente</button>
      </div>
    `;

    emit('fun_fact_viewed', { dinosaur_id: question.dinosaurId });

    this.container.querySelector('#next-btn').addEventListener('click', () => {
      this.next();
    });
  }
}

// Import emit here to avoid circular dependency issues at top.
import { emit } from '../telemetry/telemetry.js';
