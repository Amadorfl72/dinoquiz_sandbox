'use strict';

/**
 * Pregunta/Feedback screen: shows one question with its options and, once
 * the child taps an answer, the feedback for that answer.
 *
 * Correctness (TRIOFSND-77 / TRIOFSND-88, AC-7): a wrong pick is never
 * penalized — the score keeps whatever value it already had (+0), via
 * `applyAnswerToScore` in src/game/scoring.js. The correct option is always
 * highlighted with the same "acierto" style (`CORRECT_CLASS`, thick green
 * border) whether the child got it right or not; the wrong pick itself only
 * gets a neutral marker (`NEUTRAL_CLASS`) — never a "bad"/red one. A hit
 * additionally gets `CELEBRATE_CLASS` for the happy animation. Both
 * outcomes then reveal the same fun fact and "Siguiente" control, so the
 * flow to the next question is identical whether the answer was right or
 * wrong.
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

  const scoreEl = document.createElement('p');
  scoreEl.className = 'question-screen__score';
  scoreEl.setAttribute('aria-live', 'polite');
  scoreEl.textContent = `${strings.scoreLabel}: ${score}`;

  const optionsGroup = document.createElement('div');
  optionsGroup.className = 'question-screen__options';
  optionsGroup.setAttribute('role', 'group');
  optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

  const feedback = document.createElement('p');
  feedback.className = 'question-screen__feedback';
  feedback.setAttribute('aria-live', 'polite');

  const funFactHeading = document.createElement('h3');
  funFactHeading.className = 'question-screen__fun-fact-heading';
  funFactHeading.textContent = strings.funFactHeading;
  funFactHeading.hidden = true;

  const funFact = document.createElement('p');
  funFact.className = 'question-screen__fun-fact';
  funFact.setAttribute('aria-live', 'polite');
  funFact.hidden = true;

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'question-screen__next-button';
  nextButton.textContent = strings.nextButton;
  nextButton.hidden = true;

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
    const previousScore = score;
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
    scoreEl.textContent = `${strings.scoreLabel}: ${score}`;

    funFactHeading.hidden = false;
    funFact.textContent = question.funFact;
    funFact.hidden = false;

    nextButton.hidden = false;

    if (onAnswer) {
      onAnswer({
        isCorrect: correct,
        scoreDelta: score - previousScore,
        score,
        selectedIndex,
        correctIndex: question.correctAnswerIndex,
      });
    }
  }

  nextButton.addEventListener('click', () => {
    if (typeof options.onNext === 'function') {
      options.onNext(score);
    }
  });

  root.appendChild(prompt);
  root.appendChild(scoreEl);
  root.appendChild(optionsGroup);
  root.appendChild(feedback);
  root.appendChild(funFactHeading);
  root.appendChild(funFact);
  root.appendChild(nextButton);
  container.appendChild(root);

  warmUpFeedbackAnimation();

  return {
    root,
    prompt,
    scoreEl,
    optionButtons,
    feedback,
    funFact,
    nextButton,
    getScore: () => score,
    isAnswered: () => answered,
  };
}

module.exports = { renderQuestionScreen, warmUpFeedbackAnimation };
