'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const { results: strings, question: questionStrings } = require('../../public/i18n/es.json');

function buildQuestion(id) {
  return {
    id,
    dinosaur: 'trex',
    question: `Pregunta ${id}`,
    options: ['A', 'B', 'C'],
    correctAnswerIndex: 0,
    funFact: `Dato curioso ${id}`,
    image: 'dinosaurs/trex.png',
  };
}

function buildQuestionBank(count) {
  return Array.from({ length: count }, (_, index) => buildQuestion(`q-${index}`));
}

// Answers the currently visible question and advances manually via
// "Siguiente" (TRIOFSND-84): the button only becomes clickable once the
// question screen's own MIN_ADVANCE_DELAY_MS gate (AC-6) has elapsed, so
// fake timers must be advanced past it first.
async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
  // "Siguiente" stays disabled for MIN_ADVANCE_DELAY_MS after answering
  // (AC-6); fast-forward past it (async, so any pending microtask work — e.g.
  // the aria-live announcement — flushes too) so walking through a whole
  // game doesn't take real wall-clock time.
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

/** Reads the current question's prompt, then answers it and advances (see answerCurrentQuestion). */
function readPromptThenAdvance(container, { correct }) {
  const prompt = container.querySelector('.question-screen__prompt').textContent;
  answerCurrentQuestion(container, { correct });
  return prompt;
}

// Lets any promise chains already queued (e.g. renderHome's several
// `.then()` hops across fetch/storage) settle. renderHome does not depend on
// any timer firing, so this drops back to real timers for one tick rather
// than guessing how many fake-timer advances would cover every `.then()` hop.
async function flushPromises() {
  jest.useRealTimers();
  await new Promise((resolve) => setTimeout(resolve, 0));
  jest.useFakeTimers();
}

describe('TRIOFSND-100/TRIOFSND-84: app-shell navigation Quiz -> Resultados -> Volver a jugar / Salir', () => {
  let container;
  let addEventListenerSpy;

  beforeAll(() => {
    // Requiring main.js self-attaches a `window.addEventListener('load', ...)`
    // bootstrap (it drives the real PWA's startup). These tests call
    // startNewGame/renderHome directly instead, so that bootstrap is unwanted
    // here — worse, jsdom's own (real) 'load' dispatch is deferred behind a
    // timer, so advancing fake timers below can trigger it mid-test and
    // clobber #app with a freshly-bootstrapped Home screen. Swallow it.
    const originalAddEventListener = window.addEventListener.bind(window);
    addEventListenerSpy = jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'load' || type === 'hashchange') {
        return undefined;
      }
      return originalAddEventListener(type, listener, options);
    });
  });

  afterAll(() => {
    addEventListenerSpy.mockRestore();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
    jest.useRealTimers();
  });

  test('resolveScreenRenderers resolves all three screens under Node/Jest', () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    expect(typeof renderers.renderHomeScreen).toBe('function');
    expect(typeof renderers.renderQuestionScreen).toBe('function');
    expect(typeof renderers.renderResultsScreen).toBe('function');
  });

  test('acierto: reveals the "Dato Curioso" for the answered question before "Siguiente" is used to advance', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(2);

    startNewGame(container, renderers, questions, document, undefined, () => 0);

    const [correctButton] = container.querySelectorAll('.question-screen__option');
    correctButton.click();

    const funFactBox = container.querySelector('.question-screen__fun-fact-box');
    expect(funFactBox.hidden).toBe(false);
    expect(funFactBox.textContent).toContain(questions[0].funFact);

    jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
    getByRole(container, 'button', { name: questionStrings.nextButton }).click();

    expect(container.querySelector('.question-screen__prompt').textContent).toContain(questions[1].question);
  });

  test('fallo: also reveals the "Dato Curioso" (no penalty, no negative copy) before advancing to the next question', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(2);

    startNewGame(container, renderers, questions, document, undefined, () => 0);

    const buttons = container.querySelectorAll('.question-screen__option');
    buttons[1].click(); // wrong answer (correctAnswerIndex is always 0)

    const funFactBox = container.querySelector('.question-screen__fun-fact-box');
    expect(funFactBox.hidden).toBe(false);
    expect(funFactBox.textContent).toContain(questions[0].funFact);
    expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);

    jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
    getByRole(container, 'button', { name: questionStrings.nextButton }).click();

    expect(container.querySelector('.question-screen__prompt').textContent).toContain(questions[1].question);
  });

  test('startNewGame walks through every question, acertando todas, and lands on Resultados with the right score', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('startNewGame walks through every question, fallando todas, and lands on Resultados without penalizing the score', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: false });
      }

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('0/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('"Volver a jugar" resets game state and navigates to the first question of a new game', async () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      // First game: get every answer wrong (score stays 0), reach Resultados.
      startNewGame(container, renderers, questions, document, undefined, () => 0);
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: false });
      }
      expect(container.textContent).toContain('0/10');

      // Replay with a different random seed so a different subset is picked (AC-9).
      getByRole(container, 'button', { name: strings.playAgainButton }).click();

      // We should now be back on a question screen (first question of the new
      // game), not still on Resultados, with a fresh, reset score of 0.
      expect(container.querySelector('.question-screen')).not.toBeNull();
      expect(container.querySelector('.results-screen')).toBeNull();
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);

      // Finish the replayed game to confirm the reset score (not the old
      // game's answers) drives the new result.
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }
      expect(container.textContent).toContain('10/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('TRIOFSND-101: "Volver a jugar" avoids repeating the previous game\'s questions when the bank has enough fresh candidates (AC-9)', () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(40);

      startNewGame(container, renderers, questions, document, undefined, () => 0.1);
      const firstGamePrompts = [];
      for (let i = 0; i < 10; i += 1) {
        firstGamePrompts.push(readPromptThenAdvance(container, { correct: true }));
      }

      getByRole(container, 'button', { name: strings.playAgainButton }).click();

      const secondGamePrompts = [];
      for (let i = 0; i < 10; i += 1) {
        secondGamePrompts.push(readPromptThenAdvance(container, { correct: true }));
      }

      const overlap = secondGamePrompts.filter((prompt) => firstGamePrompts.includes(prompt));
      expect(overlap).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('"Salir" navigates back to Inicio', async () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const { home: homeStrings } = require('../../public/i18n/es.json');

    startNewGame(container, renderers, questions, document, undefined, () => 0);
    jest.useFakeTimers();
    try {
      for (let i = 0; i < 10; i += 1) {
        await answerCurrentQuestion(container, { correct: true });
      }
      expect(container.querySelector('.results-screen')).not.toBeNull();

      getByRole(container, 'button', { name: strings.exitButton }).click();

      // renderHome() resolves asynchronously (it awaits loadHomeStrings), so
      // let its promise chain settle before asserting on the DOM.
      await jest.advanceTimersByTimeAsync(0);

      expect(container.querySelector('.results-screen')).toBeNull();
      expect(getByRole(container, 'button', { name: homeStrings.playButton })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
    expect(container.querySelector('.results-screen')).not.toBeNull();

    getByRole(container, 'button', { name: strings.exitButton }).click();

    // renderHome() resolves asynchronously (it awaits loadHomeStrings), so
    // let its promise chain settle before asserting on the DOM.
    await flushPromises();

    expect(container.querySelector('.results-screen')).toBeNull();
    expect(getByRole(container, 'button', { name: homeStrings.playButton })).toBeInTheDocument();
  });

  test("Home's '¡Jugar!' button starts a new game reaching the first question", () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    const rendered = renderHome(document, renderers.renderHomeScreen, fetchFn).then(() => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      expect(container.querySelector('.question-screen')).not.toBeNull();
    });
    jest.advanceTimersByTime(0);
    return rendered;
  });

  describe('avance automático tras el temporizador (TRIOFSND-84)', () => {
    test('acierto: advances to the next question on its own once the auto-advance delay elapses, without a "Siguiente" tap', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      // Not enough time has passed yet: still on the same question.
      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).toBe(firstPrompt);

      // Past MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS with no manual tap:
      // the controller advances automatically.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
    });

    test('fallo: also advances automatically, carrying forward the unchanged score', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const buttons = container.querySelectorAll('.question-screen__option');
      buttons[1].click(); // wrong answer (correctAnswerIndex is always 0)

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);
    });

    test('auto-advances straight to Resultados when the last question times out unanswered-via-"Siguiente"', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(1);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('1/1');
    });

    test('a manual "Siguiente" tap cancels the pending auto-advance timer so the next question only advances once', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(3);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      answerCurrentQuestion(container, { correct: true });
      const secondPrompt = container.querySelector('.question-screen__prompt').textContent;

      // The first question's now-stale auto-advance timer would fire around
      // here if it hadn't been cancelled by the manual click above.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).toBe(secondPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
    });
  });

  test("TRIOFSND-67: Home's '¡Jugar!' button records the aggregated, non-PII partida_iniciada event and closes the tooltip immediately", () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(false),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      recordEvent: jest.fn().mockResolvedValue(1),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, storage).then(() => {
      expect(container.querySelector('.home-screen__tooltip')).not.toBeNull();

      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      // Immediate, synchronous transition off the same click: the tooltip is
      // gone and the first question is already on screen, no awaited step
      // in between.
      expect(container.querySelector('.home-screen__tooltip')).toBeNull();
      expect(container.querySelector('.question-screen')).not.toBeNull();
      expect(storage.recordEvent).toHaveBeenCalledWith('partida_iniciada');
    });
  });

  test('TRIOFSND-92: an incorrect answer records the aggregated, non-PII pregunta_respondida and pregunta_respondida_fallo events', () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      recordEvent: jest.fn().mockResolvedValue(1),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, storage).then(() => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      jest.useFakeTimers();
      try {
        answerCurrentQuestion(container, { correct: false });
      } finally {
        jest.useRealTimers();
      }

      expect(storage.recordEvent).toHaveBeenCalledWith('pregunta_respondida');
      expect(storage.recordEvent).toHaveBeenCalledWith('pregunta_respondida_fallo');
    });
  });

  test('TRIOFSND-92: a correct answer records the pregunta_respondida event but not the pregunta_respondida_fallo event', () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: require('../../public/i18n/es.json').home }),
    });
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      recordEvent: jest.fn().mockResolvedValue(1),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, storage).then(() => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      jest.useFakeTimers();
      try {
        answerCurrentQuestion(container, { correct: true });
      } finally {
        jest.useRealTimers();
      }

      expect(storage.recordEvent).toHaveBeenCalledWith('pregunta_respondida');
      expect(storage.recordEvent).not.toHaveBeenCalledWith('pregunta_respondida_fallo');
    });
  });

  describe('avance automático tras el temporizador (TRIOFSND-84)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('acierto: advances to the next question on its own once the auto-advance delay elapses, without a "Siguiente" tap', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      // Not enough time has passed yet: still on the same question.
      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).toBe(firstPrompt);

      // Past MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS with no manual tap:
      // the controller advances automatically.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);
      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
    });

    test('fallo: also advances automatically, carrying forward the unchanged score', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const firstPrompt = container.querySelector('.question-screen__prompt').textContent;
      const buttons = container.querySelectorAll('.question-screen__option');
      buttons[1].click(); // wrong answer (correctAnswerIndex is always 0)

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).not.toBe(firstPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);
    });

    test('auto-advances straight to Resultados when the last question times out unanswered-via-"Siguiente"', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(1);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS + AUTO_ADVANCE_GRACE_MS);

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('1/1');
    });

    test('a manual "Siguiente" tap cancels the pending auto-advance timer so the next question only advances once', () => {
      const { resolveScreenRenderers, startNewGame, AUTO_ADVANCE_GRACE_MS } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(3);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      answerCurrentQuestion(container, { correct: true });
      const secondPrompt = container.querySelector('.question-screen__prompt').textContent;

      // The first question's now-stale auto-advance timer would fire around
      // here if it hadn't been cancelled by the manual click above.
      jest.advanceTimersByTime(AUTO_ADVANCE_GRACE_MS);

      expect(container.querySelector('.question-screen__prompt').textContent).toBe(secondPrompt);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 1`);
    });
  });
});

describe('TRIOFSND-95: end of game (pregunta 10) computes score and racha, then navigates to Resultados', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
  });

  afterEach(() => {
    container.remove();
  });

  /** Plays a full 10-question game following a hit/miss pattern (C = correct, F = wrong) and returns the options Resultados was rendered with. */
  async function playGameWithPattern(pattern) {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);

    const capturedOptions = [];
    const renderResultsScreen = renderers.renderResultsScreen;
    renderers.renderResultsScreen = (resultsContainer, options) => {
      capturedOptions.push(options);
      return renderResultsScreen(resultsContainer, options);
    };

    jest.useFakeTimers();
    try {
      startNewGame(container, renderers, questions, document, undefined, () => 0);
      for (const mark of pattern.split('')) {
        await answerCurrentQuestion(container, { correct: mark === 'C' });
      }
    } finally {
      jest.useRealTimers();
    }

    return capturedOptions[0];
  }

  test('test_scenario 7/10: reaches Resultados with the final score and the longest streak of hits', async () => {
    // 4 hits, a miss, 3 more hits, 2 misses: score 7/10, longest streak 4.
    const options = await playGameWithPattern('CCCCFCCCFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain('7/10');
    expect(options.score).toBe(7);
    expect(options.maxStreak).toBe(4);
  });

  test('test_scenario 2/10: a low score still reports the correct (shorter) streak', async () => {
    // 2 hits back to back surrounded by misses: score 2/10, longest streak 2.
    const options = await playGameWithPattern('FFFCCFFFFF');

    expect(container.querySelector('.results-screen')).not.toBeNull();
    expect(container.textContent).toContain('2/10');
    expect(options.score).toBe(2);
    expect(options.maxStreak).toBe(2);
  });

  test('a perfect game (10/10) reports a streak equal to the score', async () => {
    const options = await playGameWithPattern('CCCCCCCCCC');

    expect(container.textContent).toContain('10/10');
    expect(options.score).toBe(10);
    expect(options.maxStreak).toBe(10);
  });

  test('a game with no hits reports a streak of 0', async () => {
    const options = await playGameWithPattern('FFFFFFFFFF');

    expect(container.textContent).toContain('0/10');
    expect(options.score).toBe(0);
    expect(options.maxStreak).toBe(0);
  });
});

describe('TRIOFSND-97: Resultados banner/rewarded ad gated by the remove-ads purchase flag', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
  });

  afterEach(() => {
    container.remove();
  });

  test('shows the banner and rewarded ad on Resultados when the purchase has not been made', () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame, ADS_REMOVED_STORAGE_KEY } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);
      const storageObj = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };

      startNewGame(container, renderers, questions, document, undefined, () => 0, storageObj);
      for (let i = 0; i < 10; i += 1) {
        answerCurrentQuestion(container, { correct: true });
      }

      expect(storageObj.getItem).toHaveBeenCalledWith(ADS_REMOVED_STORAGE_KEY);
      expect(container.querySelector('.results-screen__ads')).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('hides the banner and rewarded ad on Resultados once the purchase has been made', () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame, ADS_REMOVED_STORAGE_KEY } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);
      const storageObj = {
        getItem: jest.fn((key) => (key === ADS_REMOVED_STORAGE_KEY ? 'true' : null)),
        setItem: jest.fn(),
      };

      startNewGame(container, renderers, questions, document, undefined, () => 0, storageObj);
      for (let i = 0; i < 10; i += 1) {
        answerCurrentQuestion(container, { correct: true });
      }

      expect(container.querySelector('.results-screen__ads')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('a purchase confirmed on Home hides ads on the very next game\'s Resultados screen', () => {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const { home: homeStrings, purchase: purchaseStrings } = require('../../public/i18n/es.json');
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings, purchase: purchaseStrings }),
    });
    const memoryBackend = {};
    const storageObj = {
      getItem: jest.fn((key) => (Object.prototype.hasOwnProperty.call(memoryBackend, key) ? memoryBackend[key] : null)),
      setItem: jest.fn((key, value) => {
        memoryBackend[key] = value;
      }),
    };

    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, undefined, storageObj).then(() => {
      const purchaseButton = getByRole(container, 'button', { name: homeStrings.globalControls.purchaseButton });
      purchaseButton.click();
      const purchaseConfirmButton = getByRole(container, 'button', { name: purchaseStrings.purchaseButton });
      purchaseConfirmButton.click();

      const playButton = getByRole(container, 'button', { name: homeStrings.playButton });
      jest.useFakeTimers();
      try {
        playButton.click();
        for (let i = 0; i < 10; i += 1) {
          answerCurrentQuestion(container, { correct: true });
        }
      } finally {
        jest.useRealTimers();
      }

      expect(container.querySelector('.results-screen__ads')).toBeNull();
    });
  });
});
