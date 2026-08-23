'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const { results: strings, question: questionStrings, home: homeStrings } = require('../../public/i18n/es.json');

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

/** Reads the id (see buildQuestion) of whichever question is currently on screen. */
function readCurrentQuestionId(container) {
  const prompt = container.querySelector('.question-screen__prompt').textContent;
  return prompt.replace('Pregunta ', '');
}

/**
 * A minimal in-memory double for the `storage` argument `renderHome`/
 * `startNewGame` expect (TRIOFSND-102): implements the same
 * `recordEvent`/`recordEventOnce`/`hasSeenHomeTooltip`/`markHomeTooltipSeen`
 * surface as `src/services/storage`'s `dinoQuizStorage` and
 * `createBrowserHomeStorage`, without exercising a real backend.
 */
function createCountingStorage() {
  const counts = {};
  return {
    hasSeenHomeTooltip: () => Promise.resolve(true),
    markHomeTooltipSeen: () => Promise.resolve(),
    recordEventOnce: (eventName) => {
      counts[eventName] = (counts[eventName] || 0) + 1;
      return Promise.resolve(counts[eventName]);
    },
    recordEvent: (eventName) => {
      counts[eventName] = (counts[eventName] || 0) + 1;
      return Promise.resolve(counts[eventName]);
    },
    getCount: (eventName) => counts[eventName] || 0,
  };
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
  });

  test('"Salir" navigates back to Inicio', async () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const { home: homeStringsLocal } = require('../../public/i18n/es.json');

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
      expect(getByRole(container, 'button', { name: homeStringsLocal.playButton })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
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

  describe('TRIOFSND-102: replay_pulsado / partida_iniciada aggregated local analytics', () => {
    test('¡Jugar! -> first valid game -> Volver a jugar -> second valid game counts partida_iniciada=2 and replay_pulsado=1', async () => {
      const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const bank = buildQuestionBank(40);
      const fetchFn = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ home: homeStrings }),
      });
      const storage = createCountingStorage();

      jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(bank);

      expect(storage.getCount('partida_iniciada')).toBe(0);
      expect(storage.getCount('replay_pulsado')).toBe(0);

      await renderHome(document, renderers.renderHomeScreen, fetchFn, undefined, storage);

      jest.useFakeTimers();
      try {
        getByRole(container, 'button', { name: homeStrings.playButton }).click();

        expect(container.querySelector('.question-screen')).not.toBeNull();
        expect(storage.getCount('partida_iniciada')).toBe(1);
        expect(storage.getCount('replay_pulsado')).toBe(0);

        const firstGameIds = new Set();
        for (let i = 0; i < 10; i += 1) {
          firstGameIds.add(readCurrentQuestionId(container));
          await answerCurrentQuestion(container, { correct: true });
        }
        expect(firstGameIds.size).toBe(10);
        expect(container.querySelector('.results-screen')).not.toBeNull();

        getByRole(container, 'button', { name: strings.playAgainButton }).click();

        expect(storage.getCount('replay_pulsado')).toBe(1);
        expect(container.querySelector('.question-screen')).not.toBeNull();

        const secondGameIds = new Set();
        for (let i = 0; i < 10; i += 1) {
          secondGameIds.add(readCurrentQuestionId(container));
          await answerCurrentQuestion(container, { correct: true });
        }
        expect(secondGameIds.size).toBe(10);

        // Set-based comparison (order never matters, per TRIOFSND-102): the
        // 40-question bank makes the 40-choose-10 odds of an identical
        // subset astronomically small, so a distinct set here is effectively
        // deterministic (the same assumption the pre-existing "Volver a
        // jugar" test above already relies on for AC-9).
        expect([...secondGameIds].sort()).not.toEqual([...firstGameIds].sort());

        expect(storage.getCount('partida_iniciada')).toBe(2);
        expect(storage.getCount('replay_pulsado')).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });

    test('reentrant activations of "Volver a jugar" accept at most one replay while it is in progress', async () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(20);
      const storage = createCountingStorage();

      jest.useFakeTimers();
      try {
        startNewGame(container, renderers, questions, document, undefined, () => 0, storage);
        for (let i = 0; i < 10; i += 1) {
          await answerCurrentQuestion(container, { correct: true });
        }
        expect(storage.getCount('partida_iniciada')).toBe(1);

        const playAgainButton = getByRole(container, 'button', { name: strings.playAgainButton });

        // Simulate a child mashing the same control (mouse/touch/Enter/Space
        // all converge on this same native 'click' event) before the UI has
        // a chance to react: repeated activations on the very same,
        // already-accepted button instance.
        playAgainButton.click();
        playAgainButton.click();
        playAgainButton.click();

        expect(storage.getCount('replay_pulsado')).toBe(1);
        expect(storage.getCount('partida_iniciada')).toBe(2);
        // Exactly one new game was started: a single fresh question screen,
        // not several stacked/re-triggered attempts.
        expect(container.querySelectorAll('.question-screen').length).toBe(1);
        expect(container.querySelector('.results-screen')).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    test('a replay that fails before presenting the first question still counts replay_pulsado but not partida_iniciada', async () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(20);
      const storage = createCountingStorage();

      jest.useFakeTimers();
      try {
        startNewGame(container, renderers, questions, document, undefined, () => 0, storage);
        for (let i = 0; i < 10; i += 1) {
          await answerCurrentQuestion(container, { correct: true });
        }
        expect(storage.getCount('partida_iniciada')).toBe(1);

        const originalRenderQuestionScreen = renderers.renderQuestionScreen;
        renderers.renderQuestionScreen = () => {
          throw new Error('boom: the replay could not be rendered');
        };

        // main.js's startNewGame logs and swallows a failed render instead
        // of letting it crash the click handler (a broken replay must not
        // take down the app), so the counters below are what this test
        // actually verifies.
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
          getByRole(container, 'button', { name: strings.playAgainButton }).click();
        } finally {
          renderers.renderQuestionScreen = originalRenderQuestionScreen;
          consoleErrorSpy.mockRestore();
        }

        expect(storage.getCount('replay_pulsado')).toBe(1);
        expect(storage.getCount('partida_iniciada')).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });

    test('a replay that reshuffles the exact same 10 question IDs does not count as a new partida_iniciada', async () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      // Bank size equals the per-game count, so any replay's selection is
      // guaranteed (not just probable) to be the same 10-question set as the
      // first game, only possibly reordered -- exactly the "same IDs,
      // different order" scenario TRIOFSND-102 must detect as invalid.
      const questions = buildQuestionBank(10);
      const storage = createCountingStorage();

      jest.useFakeTimers();
      try {
        startNewGame(container, renderers, questions, document, undefined, () => 0, storage);

        const firstGameIds = new Set();
        for (let i = 0; i < 10; i += 1) {
          firstGameIds.add(readCurrentQuestionId(container));
          await answerCurrentQuestion(container, { correct: true });
        }
        expect(firstGameIds.size).toBe(10);
        expect(storage.getCount('partida_iniciada')).toBe(1);

        getByRole(container, 'button', { name: strings.playAgainButton }).click();
        expect(storage.getCount('replay_pulsado')).toBe(1);

        const secondGameIds = new Set();
        for (let i = 0; i < 10; i += 1) {
          secondGameIds.add(readCurrentQuestionId(container));
          await answerCurrentQuestion(container, { correct: true });
        }
        expect(secondGameIds.size).toBe(10);
        expect([...secondGameIds].sort()).toEqual([...firstGameIds].sort());

        // Same set (however reordered) as the immediately-previous game:
        // the replay is invalid for counting purposes. replay_pulsado still
        // stands; partida_iniciada does not move.
        expect(storage.getCount('replay_pulsado')).toBe(1);
        expect(storage.getCount('partida_iniciada')).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
