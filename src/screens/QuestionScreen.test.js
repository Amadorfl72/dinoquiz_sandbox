'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getAllByRole, getByText } = require('@testing-library/dom');

const { renderQuestionScreen, MIN_ADVANCE_DELAY_MS } = require('./QuestionScreen');
const { question: strings } = require('../../public/i18n/es.json');

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

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

  test('starts the score at 0 by default', () => {
    renderQuestionScreen(container, buildQuestion());

    expect(getByText(container, `${strings.scoreLabel}: 0`)).toBeInTheDocument();
  });

  test('the score text style meets the minimum 20sp font size (TRIOFSND-83)', () => {
    const css = fs.readFileSync(MAIN_CSS_PATH, 'utf-8');
    const ruleMatch = css.match(/\.question-screen__score\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();

    const rule = ruleMatch[1];
    const fontSizeMatch = rule.match(/font-size:\s*([\d.]+)(px|rem)/);
    expect(fontSizeMatch).not.toBeNull();

    const fontSizePx = fontSizeMatch[2] === 'rem'
      ? parseFloat(fontSizeMatch[1]) * 16
      : parseFloat(fontSizeMatch[1]);
    expect(fontSizePx).toBeGreaterThanOrEqual(20);
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
      const { optionButtons, funFactBox, funFact, nextButton } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(funFactBox).toBeVisible();
      expect(funFactBox).toHaveClass('question-screen__fun-fact-box');
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
      const { optionButtons, funFactBox, funFact, nextButton } = renderQuestionScreen(container, question);

      optionButtons[wrongIndex].click();

      expect(funFactBox).toBeVisible();
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
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
        const onNext = jest.fn();
        const { optionButtons, nextButton } = renderQuestionScreen(container, question, { score: 6, onNext });

        optionButtons[wrongIndex].click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
        nextButton.click();

        expect(onNext).toHaveBeenCalledWith(6);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('fail sound (TRIOFSND-89: neutral sound integrated with mute mode)', () => {
    test('plays the neutral fail sound on a miss', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound });

      optionButtons[wrongIndex].click();

      expect(playFailSound).toHaveBeenCalledTimes(1);
    });

    test('does not play any sound on a hit', () => {
      const question = buildQuestion();
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound });

      optionButtons[question.correctAnswerIndex].click();

      expect(playFailSound).not.toHaveBeenCalled();
    });

    test('forwards options.muted through to the sound player, so silent mode stays silent', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound, muted: true });

      optionButtons[wrongIndex].click();

      expect(playFailSound).toHaveBeenCalledWith(expect.objectContaining({ muted: true }));
    });

    test('defaults muted to false when options.muted is not provided', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const playFailSound = jest.fn();
      const { optionButtons } = renderQuestionScreen(container, question, { playFailSound });

      optionButtons[wrongIndex].click();

      expect(playFailSound).toHaveBeenCalledWith(expect.objectContaining({ muted: false }));
    });

    test('the fun fact and "Siguiente" are already visible by the time the sound player is called', () => {
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      let funFactVisibleAtCallTime = null;
      let nextButtonVisibleAtCallTime = null;
      const playFailSound = jest.fn(() => {
        funFactVisibleAtCallTime = !funFact.hidden;
        nextButtonVisibleAtCallTime = !nextButton.hidden;
      });

      const { optionButtons, funFact, nextButton } = renderQuestionScreen(container, question, { playFailSound });
      optionButtons[wrongIndex].click();

      expect(funFactVisibleAtCallTime).toBe(true);
      expect(nextButtonVisibleAtCallTime).toBe(true);
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

      // Feedback classes land before any timer fires — only the advance
      // timer (gating "Siguiente", see below) is scheduled.
      expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
      expect(elapsed).toBeLessThan(300);
      expect(jest.getTimerCount()).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('image (AC-14: alt-text for screen readers)', () => {
    test('renders the dinosaur illustration with a descriptive alt built from the i18n dinosaur name', () => {
      const question = buildQuestion();
      const { image } = renderQuestionScreen(container, question);

      expect(image.tagName).toBe('IMG');
      expect(image.src).toContain(question.image);
      expect(image.alt).toBe(strings.imageAlt.replace('{dinosaur}', strings.dinosaurNames.trex));
      expect(image.alt.length).toBeGreaterThan(0);
    });
  });

  describe('"Siguiente" advance timer (AC-6: dato curioso visible >=4s before advancing)', () => {
    test('shows "Siguiente" disabled as soon as the answer is revealed', () => {
      const question = buildQuestion();
      const { optionButtons, nextButton } = renderQuestionScreen(container, question);

      optionButtons[question.correctAnswerIndex].click();

      expect(nextButton).toBeVisible();
      expect(nextButton).toBeDisabled();
    });

    test('clicking "Siguiente" before the timer elapses does not advance', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const onNext = jest.fn();
        const { optionButtons, nextButton } = renderQuestionScreen(container, question, { onNext });

        optionButtons[question.correctAnswerIndex].click();
        nextButton.click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS - 1);

        expect(nextButton).toBeDisabled();
        expect(onNext).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    test('enables "Siguiente" once MIN_ADVANCE_DELAY_MS has elapsed, letting the child advance', () => {
      jest.useFakeTimers();
      try {
        const question = buildQuestion();
        const onNext = jest.fn();
        const { optionButtons, nextButton, getScore } = renderQuestionScreen(container, question, { onNext });

        optionButtons[question.correctAnswerIndex].click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);

        expect(nextButton).not.toBeDisabled();
        nextButton.click();
        expect(onNext).toHaveBeenCalledWith(getScore());
      } finally {
        jest.useRealTimers();
      }
    });
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
