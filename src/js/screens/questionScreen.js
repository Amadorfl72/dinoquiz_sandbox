/**
 * Question screen module.
 * Renders a single question with 3 answer options and handles answer feedback.
 */

import { GameState, incrementScore, advanceQuestion, getCurrentQuestion } from '../game/state.js';
import { renderResultsScreen } from './resultsScreen.js';
import { logEvent } from '../utils/metrics.js';
import { strings } from '../i18n/strings.es-ES.js';

/**
 * Renders a question screen.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} questions - full set of questions for this game
 * @param {number} index - zero-based question index
 * @param {object} [opts]
 * @param {Array<object>} [opts.questionPool] - pool for replay (needed when transitioning to results)
 * @param {Function} [opts.onAnswered] - callback after each answer
 */
export function renderQuestionScreen(container, questions, index, opts = {}) {
  const question = questions[index];
  if (!question) {
    // Safety fallback: if no question, go to results
    renderResultsScreen(container, GameState.score, opts.questionPool ?? questions, { onReplay: opts.onAnswered });
    return;
  }

  const questionNumber = index + 1;
  const total = questions.length;

  container.innerHTML = `
    <section class="question-screen" role="main" aria-labelledby="question-prompt">
      <div class="question-progress">${questionNumber} / ${total}</div>
      <img class="question-image" src="${question.image}" alt="" aria-hidden="true" />
      <h1 id="question-prompt" class="question-prompt">${question.prompt}</h1>
      <div class="question-options" role="group" aria-label="${strings.options_aria}">
        ${question.options.map((option, i) => `
          <button
            class="btn btn-option"
            data-index="${i}"
            type="button"
            aria-label="${option}"
          >${option}</button>
        `).join('')}
      </div>
    </section>
  `;

  // Wire option buttons
  const optionButtons = container.querySelectorAll('.btn-option');
  optionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedIndex = parseInt(btn.dataset.index, 10);
      handleAnswer(container, questions, index, selectedIndex, opts);
    });
  });
}

/**
 * Handles an answer selection: records correctness, shows feedback, then
 * transitions to the fun-fact screen or results screen.
 *
 * @param {HTMLElement} container
 * @param {Array<object>} questions
 * @param {number} index
 * @param {number} selectedIndex
 * @param {object} opts
 */
function handleAnswer(container, questions, index, selectedIndex, opts) {
  const question = questions[index];
  const isCorrect = selectedIndex === question.correctIndex;

  if (isCorrect) {
    incrementScore();
  }

  logEvent('question_answered', { is_correct: isCorrect });

  // Show fun-fact screen, then advance
  renderFunFactScreen(container, question, isCorrect, () => {
    const hasMore = advanceQuestion();
    if (hasMore) {
      renderQuestionScreen(container, questions, GameState.currentIndex, opts);
    } else {
      GameState.inProgress = false;
      logEvent('game_completed', { score: GameState.score });
      renderResultsScreen(container, GameState.score, opts.questionPool ?? questions, {
        onReplay: opts.onAnswered,
      });
    }
  });
}

/**
 * Renders the fun-fact screen with feedback and a 'Siguiente' button.
 *
 * @param {HTMLElement} container
 * @param {object} question
 * @param {boolean} isCorrect
 * @param {Function} onNext
 */
function renderFunFactScreen(container, question, isCorrect, onNext) {
  const feedbackText = isCorrect
    ? strings.feedback_correct
    : strings.feedback_incorrect.replace('{correct}', question.options[question.correctIndex]);

  container.innerHTML = `
    <section class="funfact-screen" role="main">
      <div class="funfact-feedback ${isCorrect ? 'correct' : 'incorrect'}">
        ${feedbackText}
      </div>
      <img class="funfact-image" src="${question.image}" alt="" aria-hidden="true" />
      <p class="funfact-text">${question.funFact}</p>
      <button id="next-btn" class="btn btn-primary" type="button">
        ${strings.next_button}
      </button>
    </section>
  `;

  logEvent('fun_fact_viewed');

  const nextBtn = container.querySelector('#next-btn');
  nextBtn.addEventListener('click', onNext);
}
