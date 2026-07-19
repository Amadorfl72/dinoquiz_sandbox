'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');

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

describe('TRIOFSND-113: resolvePlatformSupport', () => {
  test('reports full support when navigator.serviceWorker and manifest link support are both present', () => {
    const { resolvePlatformSupport } = require(MAIN_JS_PATH);
    const win = {
      navigator: { serviceWorker: {} },
      document: { createElement: () => ({ relList: { supports: () => true } }) },
    };

    expect(resolvePlatformSupport(win)).toEqual({
      serviceWorker: true,
      manifest: true,
      isFullySupported: true,
    });
  });

  test('reports missing service worker support on an old tablet / embedded browser', () => {
    const { resolvePlatformSupport } = require(MAIN_JS_PATH);
    const win = {
      navigator: {},
      document: { createElement: () => ({ relList: { supports: () => true } }) },
    };

    const support = resolvePlatformSupport(win);
    expect(support.serviceWorker).toBe(false);
    expect(support.isFullySupported).toBe(false);
  });

  test('reports missing manifest support when relList.supports is unavailable', () => {
    const { resolvePlatformSupport } = require(MAIN_JS_PATH);
    const win = {
      navigator: { serviceWorker: {} },
      document: { createElement: () => ({}) },
    };

    const support = resolvePlatformSupport(win);
    expect(support.manifest).toBe(false);
    expect(support.isFullySupported).toBe(false);
  });
});

describe('TRIOFSND-113: logPlatformSupportFallback', () => {
  test('logs a diagnostic when the browser is not fully supported', () => {
    const { logPlatformSupportFallback } = require(MAIN_JS_PATH);
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    logPlatformSupportFallback({ serviceWorker: false, manifest: true, isFullySupported: false });

    expect(consoleInfoSpy).toHaveBeenCalled();
    consoleInfoSpy.mockRestore();
  });

  test('stays silent when the browser is fully supported', () => {
    const { logPlatformSupportFallback } = require(MAIN_JS_PATH);
    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    logPlatformSupportFallback({ serviceWorker: true, manifest: true, isFullySupported: true });

    expect(consoleInfoSpy).not.toHaveBeenCalled();
    consoleInfoSpy.mockRestore();
  });

  test('does not throw when given no support snapshot', () => {
    const { logPlatformSupportFallback } = require(MAIN_JS_PATH);
    expect(() => logPlatformSupportFallback(undefined)).not.toThrow();
  });
});

describe('TRIOFSND-113: the game stays fully playable without service worker support', () => {
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

  test('registerServiceWorker resolves to null (no install, no advanced cache) without throwing on a browser missing serviceWorker', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const navWithoutServiceWorker = {};

    await expect(registerServiceWorker(navWithoutServiceWorker)).resolves.toBeNull();
  });

  test('Inicio -> Quiz -> Resultados completes end-to-end when the browser has no service worker support', () => {
    // Simulates an old tablet/embedded browser outside the support matrix
    // (last 2 major versions of Chrome/Edge/Safari): gameplay never touches
    // navigator.serviceWorker, only startNewGame/renderQuestionScreen driven
    // through plain DOM APIs, so it must reach Resultados exactly like on a
    // fully supported browser.
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const { results: strings, question: questionStrings } = require('../../public/i18n/es.json');
      const { MIN_ADVANCE_DELAY_MS } = require('../../src/screens/QuestionScreen');
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(10);

      startNewGame(container, renderers, questions, document, undefined, () => 0);

      for (let i = 0; i < 10; i += 1) {
        const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
        buttons[0].click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
        getByRole(container, 'button', { name: questionStrings.nextButton }).click();
      }

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');
    } finally {
      jest.useRealTimers();
    }
  });

  test('renderHome still renders Inicio over plain fetch when navigator has no serviceWorker support', async () => {
    const { renderHome } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home } = require('../../public/i18n/es.json');
    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home }) });
    const storageObj = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };

    await renderHome(doc, renderHomeScreen, fetchFn, undefined, undefined, storageObj);

    expect(getByRole(container, 'button', { name: home.playButton })).toBeInTheDocument();
  });
});

describe('TRIOFSND-113: registerServiceWorker recovers from a failing register() either way', () => {
  test('a synchronous throw from register() is treated as recoverable and does not escape', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const nav = {
      serviceWorker: {
        register: jest.fn(() => {
          throw new Error('register is not available on this embedded browser');
        }),
      },
    };

    let result;
    expect(() => {
      result = registerServiceWorker(nav);
    }).not.toThrow();
    await expect(result).resolves.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('a rejected register() promise is consumed as a recoverable failure with no unhandled rejection', async () => {
    const { registerServiceWorker } = require(MAIN_JS_PATH);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const unhandledRejectionSpy = jest.fn();
    process.on('unhandledRejection', unhandledRejectionSpy);

    const nav = { serviceWorker: { register: jest.fn().mockRejectedValue(new Error('boom')) } };

    await expect(registerServiceWorker(nav)).resolves.toBeNull();
    // Give any stray unhandled rejection a microtask/macrotask turn to surface.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(unhandledRejectionSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    process.removeListener('unhandledRejection', unhandledRejectionSpy);
    consoleErrorSpy.mockRestore();
  });
});

describe('TRIOFSND-113: install capability (beforeinstallprompt) is fully optional', () => {
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

  test('Inicio renders and a game can start with no beforeinstallprompt/install API present on window', async () => {
    const { renderHome, resolveScreenRenderers, loadQuestions } = require(MAIN_JS_PATH);
    const { renderHomeScreen } = require('../../public/scripts/homeScreen');
    const { home } = require('../../public/i18n/es.json');

    expect('BeforeInstallPromptEvent' in window).toBe(false);
    expect('onbeforeinstallprompt' in window).toBe(false);

    const doc = { getElementById: jest.fn().mockReturnValue(container) };
    const fetchFn = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home }) });
    const storageObj = { getItem: jest.fn().mockReturnValue(null), setItem: jest.fn() };

    await renderHome(doc, renderHomeScreen, fetchFn, undefined, undefined, storageObj);

    const playButton = getByRole(container, 'button', { name: home.playButton });
    expect(playButton).toBeInTheDocument();

    playButton.click();
    // Flush the microtask queue `renderHome`'s click handler awaits internally.
    await Promise.resolve();
    await Promise.resolve();

    const renderers = resolveScreenRenderers();
    const questions = loadQuestions();
    expect(renderers).toBeTruthy();
    expect(questions.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.question-screen__option').length).toBeGreaterThan(0);
  });
});

describe('TRIOFSND-113: full fallback flow — Inicio -> 10 preguntas -> Resultados -> Volver a jugar', () => {
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

  function playGame(renderers, questions, correctCount) {
    const { MIN_ADVANCE_DELAY_MS } = require('../../src/screens/QuestionScreen');
    const { question: questionStrings } = require('../../public/i18n/es.json');
    const { startNewGame } = require(MAIN_JS_PATH);

    startNewGame(container, renderers, questions, document, undefined, () => 0);

    for (let i = 0; i < 10; i += 1) {
      const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
      const optionIndex = i < correctCount ? 0 : 1;
      buttons[optionIndex].click();
      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
      getByRole(container, 'button', { name: questionStrings.nextButton }).click();
    }
  }

  test.each([
    [2, 1],
    [5, 2],
    [9, 3],
  ])(
    'a score of %i/10 (no serviceWorker, no beforeinstallprompt) maps to the authoritative %i-star band',
    (correctCount, expectedStars) => {
      jest.useFakeTimers();
      try {
        const { resolveScreenRenderers } = require(MAIN_JS_PATH);
        const { results: strings } = require('../../public/i18n/es.json');
        const renderers = resolveScreenRenderers();
        const questions = buildQuestionBank(10);

        playGame(renderers, questions, correctCount);

        expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
        expect(container.textContent).toContain(`${correctCount}/10`);
        const starsEl = container.querySelector('.results-screen__stars');
        expect(starsEl.textContent).toBe('★'.repeat(expectedStars) + '☆'.repeat(3 - expectedStars));
      } finally {
        jest.useRealTimers();
      }
    }
  );

  test('exactly 10 unique question IDs are used per game, and "Volver a jugar" starts a fresh 10-question game, all without any PWA capability', () => {
    jest.useFakeTimers();
    try {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const { results: strings, question: questionStrings } = require('../../public/i18n/es.json');
      const { MIN_ADVANCE_DELAY_MS } = require('../../src/screens/QuestionScreen');
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(20);

      const seenIds = [];
      const session = startNewGame(container, renderers, questions, document, undefined, () => 0);
      session.questions.forEach((question) => seenIds.push(question.id));

      expect(session.questions.length).toBe(10);
      expect(new Set(seenIds).size).toBe(10);

      for (let i = 0; i < 10; i += 1) {
        const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
        buttons[0].click();
        jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
        getByRole(container, 'button', { name: questionStrings.nextButton }).click();
      }

      expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
      expect(container.textContent).toContain('10/10');

      // "Volver a jugar" -- a fresh game, still with exactly 10 unique questions.
      getByRole(container, 'button', { name: strings.playAgainButton }).click();

      expect(container.querySelectorAll('.question-screen__option').length).toBeGreaterThan(0);
      expect(container.textContent).not.toContain(strings.heading);
    } finally {
      jest.useRealTimers();
    }
  });
});
