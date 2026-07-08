'use strict';

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const { renderQuestionScreen } = require('./QuestionScreen');
const { question: strings } = require('../i18n/es.json');

const sampleQuestion = {
  id: 'trex-01',
  dinosaur: 'trex',
  question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
  options: ['Solo de plantas', 'De carne, ¡era un gran cazador!', 'Solo de insectos', 'De algas del mar'],
  correctAnswerIndex: 1,
  funFact: 'El T-Rex tenía la mordida más fuerte de todos los dinosaurios carnívoros conocidos.',
  image: 'dinosaurs/trex.png',
};

describe('QuestionScreen', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  test('renders the question and one button per option', () => {
    const { optionButtons } = renderQuestionScreen(container, sampleQuestion);

    expect(getByText(container, sampleQuestion.question)).toBeInTheDocument();
    expect(optionButtons).toHaveLength(sampleQuestion.options.length);
    sampleQuestion.options.forEach((label) => {
      expect(getByRole(container, 'button', { name: label })).toBeInTheDocument();
    });
  });

  test('starts the score at 0 by default', () => {
    renderQuestionScreen(container, sampleQuestion);

    expect(getByText(container, `${strings.scoreLabel}: 0`)).toBeInTheDocument();
  });

  describe('on a correct answer', () => {
    test('adds +1 to the score', () => {
      const { optionButtons, getScore } = renderQuestionScreen(container, sampleQuestion, { score: 3 });

      optionButtons[sampleQuestion.correctAnswerIndex].click();

      expect(getScore()).toBe(4);
      expect(getByText(container, `${strings.scoreLabel}: 4`)).toBeInTheDocument();
    });

    test('highlights the chosen option with the "acierto" style', () => {
      const { optionButtons } = renderQuestionScreen(container, sampleQuestion);

      optionButtons[sampleQuestion.correctAnswerIndex].click();

      expect(optionButtons[sampleQuestion.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
    });

    test('reveals the fun fact and the "Siguiente" control', () => {
      const { optionButtons, funFact, nextButton } = renderQuestionScreen(container, sampleQuestion);

      optionButtons[sampleQuestion.correctAnswerIndex].click();

      expect(funFact).toHaveTextContent(sampleQuestion.funFact);
      expect(funFact).toBeVisible();
      expect(nextButton).toBeVisible();
    });
  });

  describe('on an incorrect answer (TRIOFSND-88: no penalty)', () => {
    test('leaves the score exactly as it was (+0)', () => {
      const { optionButtons, getScore } = renderQuestionScreen(container, sampleQuestion, { score: 5 });
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      optionButtons[wrongIndex].click();

      expect(getScore()).toBe(5);
      expect(getByText(container, `${strings.scoreLabel}: 5`)).toBeInTheDocument();
    });

    test('does not let the score go below its pre-answer value across several misses', () => {
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      [0, 1, 2].forEach(() => {
        const view = renderQuestionScreen(container, sampleQuestion, { score: 2 });
        view.optionButtons[wrongIndex].click();
        expect(view.getScore()).toBe(2);
      });
    });

    test('highlights the correct option with the same "acierto" style used on a hit', () => {
      const { optionButtons } = renderQuestionScreen(container, sampleQuestion);
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      optionButtons[wrongIndex].click();

      expect(optionButtons[sampleQuestion.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
    });

    test('does not mark the chosen wrong option as bad', () => {
      const { optionButtons } = renderQuestionScreen(container, sampleQuestion);
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      optionButtons[wrongIndex].click();

      expect(optionButtons[wrongIndex]).not.toHaveClass('question-screen__option--correct');
      expect(optionButtons[wrongIndex].className).not.toMatch(/wrong|incorrect|error|bad/i);
    });

    test('still reveals the fun fact and the "Siguiente" control, same as a hit', () => {
      const { optionButtons, funFact, nextButton } = renderQuestionScreen(container, sampleQuestion);
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      optionButtons[wrongIndex].click();

      expect(funFact).toHaveTextContent(sampleQuestion.funFact);
      expect(funFact).toBeVisible();
      expect(nextButton).toBeVisible();
    });

    test('shows a positive-toned message, never a negative one', () => {
      const { optionButtons, feedbackMessage } = renderQuestionScreen(container, sampleQuestion);
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      optionButtons[wrongIndex].click();

      expect(feedbackMessage).toHaveTextContent(strings.incorrectFeedback);
      expect(feedbackMessage.textContent).not.toMatch(/mal|error|incorrecto|fallaste/i);
    });

    test('reports scoreDelta 0 and isCorrect false via onAnswer', () => {
      const onAnswer = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, sampleQuestion, { score: 6, onAnswer });
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      optionButtons[wrongIndex].click();

      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ isCorrect: false, scoreDelta: 0, score: 6, selectedIndex: wrongIndex })
      );
    });

    test('advancing via "Siguiente" carries forward the unchanged score', () => {
      const onNext = jest.fn();
      const { optionButtons, nextButton } = renderQuestionScreen(container, sampleQuestion, { score: 6, onNext });
      const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

      optionButtons[wrongIndex].click();
      nextButton.click();

      expect(onNext).toHaveBeenCalledWith(6);
    });
  });

  test('locks selection after answering — a second tap on another option is ignored', () => {
    const onAnswer = jest.fn();
    const { optionButtons, getScore } = renderQuestionScreen(container, sampleQuestion, { onAnswer });
    const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

    optionButtons[wrongIndex].click();
    optionButtons[sampleQuestion.correctAnswerIndex].click();

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(getScore()).toBe(0);
    optionButtons.forEach((optionButton) => expect(optionButton.disabled).toBe(true));
  });

  test('does not hardcode copy — text is sourced from the es locale resource file', () => {
    const { optionButtons, nextButton } = renderQuestionScreen(container, sampleQuestion, { locale: 'es' });
    const wrongIndex = sampleQuestion.options.findIndex((_, i) => i !== sampleQuestion.correctAnswerIndex);

    optionButtons[wrongIndex].click();

    expect(container.textContent).toContain(strings.incorrectFeedback);
    expect(nextButton).toHaveTextContent(strings.nextButton);
  });
});
