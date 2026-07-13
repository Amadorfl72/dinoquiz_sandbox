'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const { results: strings, question: questionStrings } = require('../../public/i18n/es.json');
const { MIN_ADVANCE_DELAY_MS } = require('../../src/screens/QuestionScreen');

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

  // "Siguiente" stays disabled for MIN_ADVANCE_DELAY_MS after answering
  // (AC-6); fast-forward past it (async, so any pending microtask work — e.g.
  // the aria-live announcement — flushes too) so walking through a whole
  // game doesn't take real wall-clock time.
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
async function answerCurrentQuestion(container, { correct }) {
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

describe('TRIOFSND-100: app-shell navigation Quiz -> Resultados -> Volver a jugar / Salir', () => {
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

  test('startNewGame walks through every question and lands on Resultados with the right score', async () => {
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
    } finally {
      jest.useRealTimers();
    }
    expect(container.querySelector('.results-screen')).not.toBeNull();

    getByRole(container, 'button', { name: strings.exitButton }).click();

    // renderHome() resolves asynchronously (it awaits loadHomeStrings), so
    // let its promise chain settle before asserting on the DOM.
    await jest.advanceTimersByTimeAsync(0);

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

    return renderHome(document, renderers.renderHomeScreen, fetchFn).then(() => {
      getByRole(container, 'button', { name: require('../../public/i18n/es.json').home.playButton }).click();

      expect(container.querySelector('.question-screen')).not.toBeNull();
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

    return renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, storage).then(() => {
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
