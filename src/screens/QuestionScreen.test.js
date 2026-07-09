'use strict';

require('@testing-library/jest-dom');
const { getByRole, getAllByRole, getByText } = require('@testing-library/dom');

const { renderQuestionScreen } = require('./QuestionScreen');
const { question: strings } = require('../../public/i18n/es.json');

function buildQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: 'trex',
    question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
    options: ['Solo de plantas', 'De carne, ¡era un gran cazador!', 'Solo de insectos', 'De algas del mar'],
    correctAnswerIndex: 1,
    funFact: 'El T-Rex tenía la mordida más fuerte de todos los dinosaurios carnívoros conocidos.',
    image: 'dinosaurs/trex.png',
    ...overrides,
  };
}

describe('QuestionScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the question prompt and one accessible button per option', () => {
    const question = buildQuestion();
    renderQuestionScreen(container, question);

    expect(getByText(container, question.question)).toBeInTheDocument();
    const buttons = getAllByRole(container, 'button');
    expect(buttons).toHaveLength(question.options.length);
    question.options.forEach((optionText) => {
      expect(getByRole(container, 'button', { name: optionText })).toBeInTheDocument();
    });
  });

  test('renders the dinosaur illustration above the prompt with a descriptive alt-text (TRIOFSND-72, AC-4/AC-14)', () => {
    const question = buildQuestion();
    const { image, prompt } = renderQuestionScreen(container, question);

    expect(image.tagName).toBe('IMG');
    expect(image).toHaveAttribute('src', `/assets/images/${question.image}`);
    expect(image.alt).toContain('Tyrannosaurus Rex');
    expect(image.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('starts the score at 0 by default', () => {
    renderQuestionScreen(container, buildQuestion());

    expect(getByText(container, `${strings.scoreLabel}: 0`)).toBeInTheDocument();
  });

  describe('on a correct answer', () => {
    test('adds +1 to the score, highlights the option green, and plays the celebration animation', () => {
      const question = buildQuestion();
      const onAnswer = jest.fn();
      const { optionButtons, getScore } = renderQuestionScreen(container, question, { score: 3, onAnswer });

      const correctButton = optionButtons[question.correctAnswerIndex];
      correctButton.click();

      expect(correctButton).toHaveClass('question-screen__option--correct');
      expect(correctButton).toHaveClass('question-screen__option--celebrate');
      expect(getScore()).toBe(4);
      expect(getByText(container, `${strings.scoreLabel}: 4`)).toBeInTheDocument();
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
          score: 4,
          scoreDelta: 1,
          correctIndex: question.correctAnswerIndex,
          selectedIndex: question.correctAnswerIndex,
        })
      );
    });

    test('shows the celebratory feedback copy', () => {
      const question = buildQuestion();
      const { optionButtons, feedback } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(feedback).toHaveTextContent(strings.feedback.correct);
    });

    test('reveals the fun fact and the "Siguiente" control', () => {
      const question = buildQuestion();
      const { optionButtons, funFact, nextButton } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(funFact).toHaveTextContent(question.funFact);
      expect(funFact).toBeVisible();
      expect(nextButton).toBeVisible();
    });
  });

  describe('on an incorrect answer (TRIOFSND-88: no penalty)', () => {
    test('leaves the score exactly as it was (+0)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, getScore } = renderQuestionScreen(container, question, { score: 5 });

      optionButtons[wrongIndex].click();

      expect(getScore()).toBe(5);
      expect(getByText(container, `${strings.scoreLabel}: 5`)).toBeInTheDocument();
    });

    test('does not let the score go below its pre-answer value across several misses', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);

      [0, 1, 2].forEach(() => {
        const view = renderQuestionScreen(container, question, { score: 2 });
        view.optionButtons[wrongIndex].click();
        expect(view.getScore()).toBe(2);
      });
    });

    test('marks only the chosen option as neutral (no red styling) and highlights the correct option, without the celebration animation', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(optionButtons[wrongIndex]).toHaveClass('question-screen__option--neutral');
      expect(optionButtons[wrongIndex]).not.toHaveClass('question-screen__option--correct');
      expect(optionButtons[wrongIndex].className).not.toMatch(/wrong|incorrect|error|bad/i);
      expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
      expect(optionButtons[question.correctAnswerIndex]).not.toHaveClass('question-screen__option--celebrate');
    });

    test('still reveals the fun fact and the "Siguiente" control, same as a hit', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, funFact, nextButton } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(funFact).toHaveTextContent(question.funFact);
      expect(funFact).toBeVisible();
      expect(nextButton).toBeVisible();
    });

    test('shows a neutral/positive-toned message, never a negative one', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, feedback } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(feedback).toHaveTextContent(strings.feedback.incorrect);
      expect(feedback.textContent.toLowerCase()).not.toMatch(/mal|incorrecto|fallaste|error/);
    });

    test('the aria-live feedback announcement spells out the correct answer text, not just "esta" (TRIOFSND-90, AC-14)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, feedback } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(feedback).toHaveAttribute('aria-live', 'polite');
      expect(feedback).toHaveTextContent(question.options[question.correctAnswerIndex]);
    });

    test('gives the correct option a descriptive "Respuesta correcta" aria-label, and the tapped option a neutral one (TRIOFSND-90)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      const correctButton = optionButtons[question.correctAnswerIndex];
      const wrongButton = optionButtons[wrongIndex];

      expect(correctButton.getAttribute('aria-label')).toContain(question.options[question.correctAnswerIndex]);
      expect(correctButton.getAttribute('aria-label').toLowerCase()).not.toMatch(/mal|incorrecto|fallaste|error|wrong/);
      expect(wrongButton.getAttribute('aria-label')).toContain(question.options[wrongIndex]);
      expect(wrongButton.getAttribute('aria-label').toLowerCase()).not.toMatch(/mal|incorrecto|fallaste|error|wrong/);
    });

    test('keeps the dinosaur illustration and its descriptive alt-text unchanged after a miss (TRIOFSND-90)', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, image } = renderQuestionScreen(container, question);
      const altBeforeAnswering = image.alt;

      optionButtons[wrongIndex].click();

      expect(image.alt).toBe(altBeforeAnswering);
      expect(image.alt).toContain('Tyrannosaurus Rex');
      expect(image).toBeVisible();
    });

    test('reports scoreDelta 0 and isCorrect false via onAnswer', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const onAnswer = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { score: 6, onAnswer });

      optionButtons[wrongIndex].click();

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
          score: 6,
          scoreDelta: 0,
          correctIndex: question.correctAnswerIndex,
          selectedIndex: wrongIndex,
        })
      );
    });

    test('advancing via "Siguiente" carries forward the unchanged score', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const onNext = jest.fn();
      const { optionButtons, nextButton } = renderQuestionScreen(container, question, { score: 6, onNext });

      optionButtons[wrongIndex].click();
      nextButton.click();

      expect(onNext).toHaveBeenCalledWith(6);
    });
  });

  test('starts from a given running score and only adds on a hit', () => {
    const question = buildQuestion();
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { score: 4 });

    optionButtons[question.correctAnswerIndex].click();

    expect(getScore()).toBe(5);
  });

  test('once answered, all options are disabled so a second tap cannot change the score or re-trigger onAnswer', () => {
    const question = buildQuestion();
    const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
    const onAnswer = jest.fn();
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { onAnswer });

    optionButtons[wrongIndex].click();
    optionButtons[question.correctAnswerIndex].click();

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(getScore()).toBe(0);
    optionButtons.forEach((optionButton) => expect(optionButton).toBeDisabled());
  });

  test('feedback classes are applied synchronously in the click handler, well within the 300ms budget (AC-5)', () => {
    jest.useFakeTimers();
    try {
      const question = buildQuestion();
      const { optionButtons } = renderQuestionScreen(container, question);

      const start = performance.now();
      optionButtons[question.correctAnswerIndex].click();
      const elapsed = performance.now() - start;

      // No timer needed to advance for the feedback to already be present —
      // it isn't scheduled on a timer at all.
      expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
      expect(elapsed).toBeLessThan(300);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    const question = buildQuestion();
    const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
    const { optionButtons, nextButton } = renderQuestionScreen(container, question, { locale: 'es' });

    expect(getByRole(container, 'group', { name: strings.optionsGroupLabel })).toBeInTheDocument();

    optionButtons[wrongIndex].click();

    expect(container.textContent).toContain(strings.feedback.incorrect);
    expect(nextButton).toHaveTextContent(strings.nextButton);
  });
});
