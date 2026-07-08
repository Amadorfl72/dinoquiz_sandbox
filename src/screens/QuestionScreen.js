'use strict';

/**
 * Question/Feedback screen: shows one question with its options and, once
 * the child taps an answer, the feedback for that answer.
 *
 * Per TRIOFSND-88 / AC-7, a wrong pick is never penalized: the score keeps
 * whatever value it already had (+0), the correct option is highlighted
 * with the very same "acierto" style used when the child *does* get it
 * right (`question-screen__option--correct`), and the wrong pick itself is
 * never tagged as bad — it just stops being selectable. Both outcomes then
 * reveal the same fun fact and "Siguiente" control, so the flow to the next
 * question is identical whether the answer was right or wrong.
 */

const { DEFAULT_LOCALE, getStrings } = require('../i18n');
const { applyAnswer } = require('../game/scoring');

function renderQuestionScreen(container, question, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const { question: strings } = getStrings(locale);
  const initialScore = options.score || 0;

  container.innerHTML = '';

  let answered = false;
  let score = initialScore;

  const root = document.createElement('div');
  root.className = 'question-screen';

  const questionText = document.createElement('h2');
  questionText.className = 'question-screen__question';
  questionText.textContent = question.question;

  const scoreEl = document.createElement('p');
  scoreEl.className = 'question-screen__score';
  scoreEl.setAttribute('aria-live', 'polite');
  scoreEl.textContent = `${strings.scoreLabel}: ${score}`;

  const optionsGroup = document.createElement('div');
  optionsGroup.className = 'question-screen__options';
  optionsGroup.setAttribute('role', 'group');
  optionsGroup.setAttribute('aria-label', strings.optionsGroupLabel);

  const feedbackMessage = document.createElement('p');
  feedbackMessage.className = 'question-screen__feedback-message';
  feedbackMessage.hidden = true;

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

  const optionButtons = question.options.map((optionLabel, index) => {
    const optionButton = document.createElement('button');
    optionButton.type = 'button';
    optionButton.className = 'question-screen__option';
    optionButton.textContent = optionLabel;
    optionButton.addEventListener('click', () => handleOptionClick(index));
    optionsGroup.appendChild(optionButton);
    return optionButton;
  });

  function handleOptionClick(selectedIndex) {
    if (answered) {
      return;
    }
    answered = true;

    const correctIndex = question.correctAnswerIndex;
    const isCorrect = selectedIndex === correctIndex;
    const result = applyAnswer(score, isCorrect);
    score = result.score;

    optionButtons.forEach((optionButton) => {
      optionButton.disabled = true;
    });

    // Same class in both branches: correctness is always shown on the
    // correct option, never as a "wrong" mark on the one that was picked.
    optionButtons[correctIndex].classList.add('question-screen__option--correct');
    if (!isCorrect) {
      optionButtons[selectedIndex].setAttribute('data-selected', 'true');
    }

    feedbackMessage.textContent = isCorrect ? strings.correctFeedback : strings.incorrectFeedback;
    feedbackMessage.hidden = false;

    scoreEl.textContent = `${strings.scoreLabel}: ${score}`;

    funFactHeading.hidden = false;
    funFact.textContent = question.funFact;
    funFact.hidden = false;

    nextButton.hidden = false;

    if (typeof options.onAnswer === 'function') {
      options.onAnswer({
        isCorrect,
        scoreDelta: result.delta,
        score,
        selectedIndex,
        correctIndex,
      });
    }
  }

  nextButton.addEventListener('click', () => {
    if (typeof options.onNext === 'function') {
      options.onNext(score);
    }
  });

  root.appendChild(questionText);
  root.appendChild(scoreEl);
  root.appendChild(optionsGroup);
  root.appendChild(feedbackMessage);
  root.appendChild(funFactHeading);
  root.appendChild(funFact);
  root.appendChild(nextButton);
  container.appendChild(root);

  return {
    root,
    questionText,
    scoreEl,
    optionButtons,
    feedbackMessage,
    funFact,
    nextButton,
    getScore: () => score,
  };
}

module.exports = { renderQuestionScreen };
