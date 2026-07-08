'use strict';

require('@testing-library/jest-dom');
const { getByRole, getAllByRole, getByText } = require('@testing-library/dom');

const { renderQuestionScreen } = require('./QuestionScreen');
const { question: strings } = require('../i18n/es.json');

function buildQuestion(overrides = {}) {
  return {
    id: 'trex-01',
    dinosaur: 'trex',
    question: '¿De qué se alimentaba el Tyrannosaurus Rex?',
    options: ['Solo de plantas', 'De carne', 'Solo de insectos', 'De algas del mar'],
    correctAnswerIndex: 1,
    funFact: 'El T-Rex tenía una mordida muy potente.',
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

  test('renders the question prompt and every option as an accessible button', () => {
    const question = buildQuestion();
    renderQuestionScreen(container, question);

    expect(getByText(container, question.question)).toBeInTheDocument();
    const buttons = getAllByRole(container, 'button');
    expect(buttons).toHaveLength(question.options.length);
    question.options.forEach((optionText) => {
      expect(getByRole(container, 'button', { name: optionText })).toBeInTheDocument();
    });
  });

  test('a correct pick highlights that option in green with a thick border, plays the happy animation, and scores +1', () => {
    const question = buildQuestion();
    const onAnswer = jest.fn();
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { onAnswer });

    const correctButton = optionButtons[question.correctAnswerIndex];
    correctButton.click();

    expect(correctButton).toHaveClass('question-screen__option--correct');
    expect(correctButton).toHaveClass('question-screen__option--celebrate');
    expect(getScore()).toBe(1);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: true, score: 1, correctIndex: question.correctAnswerIndex })
    );
  });

  test('a wrong pick marks only the chosen option as neutral (no red styling), still reveals the correct one, and does not score', () => {
    const question = buildQuestion();
    const onAnswer = jest.fn();
    const wrongIndex = 0;
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { onAnswer });

    optionButtons[wrongIndex].click();

    expect(optionButtons[wrongIndex]).toHaveClass('question-screen__option--neutral');
    expect(optionButtons[wrongIndex]).not.toHaveClass('question-screen__option--correct');
    expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
    expect(optionButtons[question.correctAnswerIndex]).not.toHaveClass('question-screen__option--celebrate');
    expect(getScore()).toBe(0);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: false, score: 0, correctIndex: question.correctAnswerIndex })
    );
  });

  test('the miss feedback copy is neutral/positive, never negative language', () => {
    const question = buildQuestion();
    const { optionButtons, feedback } = renderQuestionScreen(container, question);

    optionButtons[0].click();

    expect(feedback).toHaveTextContent(strings.feedback.incorrect);
    expect(feedback.textContent.toLowerCase()).not.toMatch(/mal|incorrecto|fallaste|error/);
  });

  test('the hit feedback copy is celebratory', () => {
    const question = buildQuestion();
    const { optionButtons, feedback } = renderQuestionScreen(container, question);

    optionButtons[question.correctAnswerIndex].click();

    expect(feedback).toHaveTextContent(strings.feedback.correct);
  });

  test('starts from a given running score and only adds on a hit', () => {
    const question = buildQuestion();
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { score: 4 });

    optionButtons[question.correctAnswerIndex].click();

    expect(getScore()).toBe(5);
  });

  test('once answered, all options are disabled so a second tap cannot change the score (no double-scoring)', () => {
    const question = buildQuestion();
    const onAnswer = jest.fn();
    const { optionButtons, getScore } = renderQuestionScreen(container, question, { onAnswer });

    optionButtons[question.correctAnswerIndex].click();
    optionButtons.forEach((button) => expect(button).toBeDisabled());

    optionButtons[0].click();

    expect(getScore()).toBe(1);
    expect(onAnswer).toHaveBeenCalledTimes(1);
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

  test('does not hardcode copy — options group label comes from the es locale resource', () => {
    renderQuestionScreen(container, buildQuestion(), { locale: 'es' });

    expect(getByRole(container, 'group', { name: strings.optionsGroupLabel })).toBeInTheDocument();
  });
});
