/**
 * questionScreen.js
 * Renders the question screen with 3 answer options.
 * Called on game start and after each 'Siguiente' / replay transition.
 */

import { GameState } from '../gameState.js';
import { logEvent } from '../analytics.js';

/**
 * Renders a single question screen.
 * @param {Object} question - The question object to display.
 * @param {Object} ui - UI helpers for screen transitions and asset access.
   */
function renderQuestionScreen(question, ui) {
  if (!question) {
    console.error('[DinoQuiz] No question to render.');
    ui.showStartScreen();
    return;
  }

  const container = ui.getScreenContainer();
  const currentIndex = GameState.get().currentIndex;
  const total = GameState.getTotalQuestions();

  container.innerHTML = `
    <section class="question-screen" role="region" aria-label="Pregunta ${currentIndex + 1} de ${total}">
      <div class="question__progress">
        <span class="question__progress-text">${currentIndex + 1} / ${total}</span>
      </div>
      <div class="question__content">
        <img
          class="question__image"
          src="${ui.getAssetUrl(question.dinosaurImage)}"
          alt="${question.dinosaurName}"
          loading="eager"
        />
        <h2 class="question__text">${question.statement}</h2>
        <div class="question__options" role="group" aria-label="Opciones de respuesta">
          ${question.options
            .map(
              (option, index) => `
            <button
              class="btn btn--option"
              data-option-index="${index}"
              type="button"
              aria-label="Opción ${index + 1}: ${option}"
            >
              ${option}
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    </section>
  `;

  // Attach answer handlers
  const optionButtons = container.querySelectorAll('.btn--option');
  optionButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const selectedIndex = parseInt(event.currentTarget.dataset.optionIndex, 10);
      handleAnswer(selectedIndex, question, ui);
    });
  });
}

/**
 * Handles an answer selection.
 * @param {number} selectedIndex
 * @param {Object} question
 * @param {Object} ui
   */
function handleAnswer(selectedIndex, question, ui) {
  const isCorrect = selectedIndex === question.correctAnswer;

  GameState.recordAnswer(question.id, selectedIndex, isCorrect);

  logEvent('question_answered', {
    question_id: question.id,
    is_correct: isCorrect,
  });

  // Disable all option buttons to prevent multiple selections
  const optionButtons = ui.getScreenContainer().querySelectorAll('.btn--option');
  optionButtons.forEach((btn) => {
    btn.disabled = true;
    const idx = parseInt(btn.dataset.optionIndex, 10);
    if (idx === question.correctAnswer) {
      btn.classList.add('btn--option-correct');
    } else if (idx === selectedIndex && !isCorrect) {
      btn.classList.add('btn--option-wrong');
    }
  });

  // Play sound effect
  if (isCorrect) {
    ui.playSound('correct');
  } else {
    ui.playSound('wrong');
  }

  // Transition to fun fact screen after a brief delay
  setTimeout(() => {
    ui.showFunFactScreen(question, isCorrect);
  }, 800);
}

export { renderQuestionScreen, handleAnswer };
