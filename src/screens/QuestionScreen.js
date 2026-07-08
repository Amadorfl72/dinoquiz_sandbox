'use strict';

/**
 * Pregunta/Feedback screen (TRIOFSND-77): renders one question, and on tap
 * highlights the correct option in green with a thick border, plays a happy
 * animation on a hit, and — on a miss — only marks the picked option with a
 * neutral color (no red, no negative copy) while still revealing the
 * correct one. Score only ever goes up (see src/game/scoring.js): a miss
 * never subtracts (AC-7).
 *
 * Performance (AC-5, "<300ms"): all feedback classes are toggled
 * synchronously inside the click handler — no timers, no awaited work — so
 * the browser paints the new state on the very next frame. The only
 * animation used is the CSS keyframe in main.css (transform/opacity only,
 * compositor-driven, no layout thrashing). `warmUpFeedbackAnimation` forces
 * the browser to resolve that keyframe's styles once, off-screen, right
 * after the question mounts, so the child's first tap doesn't pay a
 * first-run style-recalculation cost.
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');
const { isAnswerCorrect, applyAnswerToScore } = require('../game/scoring');

const OPTION_CLASS = 'question-screen__option';
const CORRECT_CLASS = 'question-screen__option--correct';
const NEUTRAL_CLASS = 'question-screen__option--neutral';
const CELEBRATE_CLASS = 'question-screen__option--celebrate';

function warmUpFeedbackAnimation() {
  if (typeof document === 'undefined') return;

  const probe = document.createElement('div');
  probe.className = `${OPTION_CLASS} ${CORRECT_CLASS} ${CELEBRATE_CLASS}`;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  document.body.appendChild(probe);
  // Reading layout forces style resolution now instead of on the child's tap.
  void probe.getBoundingClientRect();
  probe.remove();
}

function renderQuestionScreen(container, question, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { question: strings } = getStrings(locale);
  const onAnswer = typeof options.onAnswer === 'function' ? options.onAnswer : null;

  let score = options.score || 0;
  let answered = false;

  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'question-screen';

  const prompt = document.createElement('h2');
  prompt.className = 'question-screen__prompt';
  prompt.textContent = question.question;

  const optionsGroup = document.createElement('div');
  optionsGroup.className = 'question-screen__options';
  optionsGroup.setAttribute('role', 'group');
  optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

  const feedback = document.createElement('p');
  feedback.className = 'question-screen__feedback';
  feedback.setAttribute('aria-live', 'polite');

  const optionButtons = question.options.map((optionText, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = OPTION_CLASS;
    button.textContent = optionText;
    button.addEventListener('click', () => handleSelect(index));
    optionsGroup.appendChild(button);
    return button;
  });

  function handleSelect(selectedIndex) {
    if (answered) return;
    answered = true;

    const correct = isAnswerCorrect(question, selectedIndex);
    score = applyAnswerToScore(score, correct);

    optionButtons.forEach((button, index) => {
      button.disabled = true;

      if (index === question.correctAnswerIndex) {
        button.classList.add(CORRECT_CLASS);
        if (correct) {
          button.classList.add(CELEBRATE_CLASS);
        }
      } else if (index === selectedIndex) {
        button.classList.add(NEUTRAL_CLASS);
      }
    });

    feedback.textContent = correct ? strings.feedback.correct : strings.feedback.incorrect;

    if (onAnswer) {
      onAnswer({
        isCorrect: correct,
        score,
        selectedIndex,
        correctIndex: question.correctAnswerIndex,
      });
    }
  }

  root.appendChild(prompt);
  root.appendChild(optionsGroup);
  root.appendChild(feedback);
  container.appendChild(root);

  warmUpFeedbackAnimation();

  return {
    root,
    optionButtons,
    feedback,
    getScore: () => score,
    isAnswered: () => answered,
  };
}

module.exports = { renderQuestionScreen, warmUpFeedbackAnimation };
