'use strict';

const fs = require('fs');
const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getAllByRole, getByText } = require('@testing-library/dom');

const { renderQuestionScreen, MIN_ADVANCE_DELAY_MS } = require('./QuestionScreen');
const { createSoundService, SOUND_SRC, MUTE_STORAGE_KEY } = require('../services/sound');
const { question: strings } = require('../../public/i18n/es.json');

function createFakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

function createFakeAudio() {
  return {
    src: '',
    preload: '',
    currentTime: 0,
    played: 0,
    play() {
      this.played += 1;
      return Promise.resolve();
    },
  };
}

function createFakeAudioFactory() {
  const created = {};
  const factory = (src) => {
    const audio = createFakeAudio();
    audio.src = src;
    created[src] = audio;
    return audio;
  };
  factory.created = created;
  return factory;
}

const MAIN_CSS_PATH = path.resolve(__dirname, '../../public/styles/main.css');

/** Reads the `:root { --token: value; }` design tokens (TRIOFSND-133) so CSS rules that reference them via `var(--token)` can be resolved to a concrete value below. */
function readCssVariables(css) {
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  const variables = {};
  if (rootMatch) {
    const declarationPattern = /(--[\w-]+):\s*([^;]+);/g;
    let declaration;
    while ((declaration = declarationPattern.exec(rootMatch[1])) !== null) {
      variables[declaration[1]] = declaration[2].trim();
    }
  }
  return variables;
}

function resolveCssValue(value, variables) {
  const varMatch = value.match(/^var\((--[\w-]+)\)$/);
  return varMatch ? variables[varMatch[1]] || value : value;
}

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
  let originalAudio;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // jsdom has no real media playback, so swap in a stub before any test
    // lets the default soundService construct a real `Audio` (see the
    // "on a correct/incorrect answer" describes below) — this keeps these
    // tests focused on the visual feedback contract; TRIOFSND-78's own
    // mute/playback behavior is covered by src/services/sound/index.test.js.
    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    container.remove();
    window.Audio = originalAudio;
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
    const variables = readCssVariables(css);
    const ruleMatch = css.match(/\.question-screen__score\s*\{([^}]*)\}/);
    expect(ruleMatch).not.toBeNull();

    const rule = ruleMatch[1];
    const declarationMatch = rule.match(/font-size:\s*([^;]+);/);
    expect(declarationMatch).not.toBeNull();

    const resolvedValue = resolveCssValue(declarationMatch[1].trim(), variables);
    const fontSizeMatch = resolvedValue.match(/^([\d.]+)(px|rem)$/);
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

  describe('feedback sound effects integration (TRIOFSND-78, AC-5/AC-11)', () => {
    test('normal mode: a correct answer plays the positive sound, not the neutral one', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const question = buildQuestion();
      const { optionButtons } = renderQuestionScreen(container, question, { soundService });

      optionButtons[question.correctAnswerIndex].click();

      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(1);
      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(0);
    });

    test('normal mode: an incorrect answer plays the neutral sound, not the positive one', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({ audioFactory, storageObj: createFakeStorage() });
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons } = renderQuestionScreen(container, question, { soundService });

      optionButtons[wrongIndex].click();

      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(1);
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(0);
    });

    test('muted mode: with `dinoquiz:muted` persisted as true, a correct answer skips the audio but shows the same visual feedback', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({
        audioFactory,
        storageObj: createFakeStorage({ [MUTE_STORAGE_KEY]: 'true' }),
      });
      const question = buildQuestion();
      const { optionButtons, feedback, funFactBox, funFact, nextButton } = renderQuestionScreen(container, question, {
        soundService,
      });

      optionButtons[question.correctAnswerIndex].click();

      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(0);
      expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--correct');
      expect(optionButtons[question.correctAnswerIndex]).toHaveClass('question-screen__option--celebrate');
      expect(feedback).toHaveTextContent(strings.feedback.correct);
      expect(funFactBox).toBeVisible();
      expect(funFact).toHaveTextContent(question.funFact);
      expect(nextButton).toBeVisible();
    });

    test('muted mode: an incorrect answer also skips the audio while still revealing the correct answer and fun fact', () => {
      const audioFactory = createFakeAudioFactory();
      const soundService = createSoundService({
        audioFactory,
        storageObj: createFakeStorage({ [MUTE_STORAGE_KEY]: 'true' }),
      });
      const question = buildQuestion();
      const wrongIndex = question.options.findIndex((_, i) => i !== question.correctAnswerIndex);
      const { optionButtons, feedback, funFactBox, nextButton } = renderQuestionScreen(container, question, {
        soundService,
      });

      optionButtons[wrongIndex].click();

      expect(audioFactory.created[SOUND_SRC.incorrect].played).toBe(0);
      expect(feedback).toHaveTextContent(strings.feedback.incorrect);
      expect(funFactBox).toBeVisible();
      expect(nextButton).toBeVisible();
    });

    test('mid-game unmute: clearing the persisted mute flag between two answers resumes playback on the very next one', () => {
      const audioFactory = createFakeAudioFactory();
      const storageObj = createFakeStorage({ [MUTE_STORAGE_KEY]: 'true' });
      const soundService = createSoundService({ audioFactory, storageObj });
      const question = buildQuestion();

      const first = renderQuestionScreen(container, question, { soundService });
      first.optionButtons[question.correctAnswerIndex].click();
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(0);

      storageObj.setItem(MUTE_STORAGE_KEY, 'false');

      const second = renderQuestionScreen(container, buildQuestion({ id: 'trex-02' }), { soundService });
      second.optionButtons[question.correctAnswerIndex].click();
      expect(audioFactory.created[SOUND_SRC.correct].played).toBe(1);
    });
  });
});
