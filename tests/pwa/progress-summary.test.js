'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const {
  results: strings,
  question: questionStrings,
  home: homeStrings,
  progress: progressStrings,
} = require('../../public/i18n/es.json');

function buildQuestion(id, overrides = {}) {
  return {
    id,
    dinosaur: 'trex',
    question: `Pregunta ${id}`,
    options: ['A', 'B', 'C'],
    correctAnswerIndex: 0,
    dato_curioso: `funFacts.${id}`,
    funFact: `Dato curioso ${id}`,
    image: 'dinosaurs/trex.png',
    ...overrides,
  };
}

function buildQuestionBank(count) {
  return Array.from({ length: count }, (_, index) => buildQuestion(`q-${index}`));
}

function createSharedAdapter(store) {
  return {
    name: 'memory',
    async isAvailable() {
      return true;
    },
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

// "Siguiente" stays disabled for MIN_ADVANCE_DELAY_MS after answering (AC-6);
// fast-forward past it (async, so any pending microtask work flushes too) so
// walking through a whole game doesn't take real wall-clock time.
async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1;
  buttons[index].click();
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

// renderHome/renderResultsFor resolve asynchronously (fetch + storage reads);
// let their promise chains settle without depending on any timer firing.
async function flushPromises() {
  jest.useRealTimers();
  await new Promise((resolve) => setTimeout(resolve, 0));
  jest.useFakeTimers();
}

function progressText(container) {
  return {
    bestScore: container.querySelector('.progress-summary__best-score').textContent,
    maxStreak: container.querySelector('.progress-summary__max-streak').textContent,
    discovered: container.querySelector('.progress-summary__discovered').textContent,
  };
}

describe('TRIOFSND-129: historic progress (mejor puntuación, racha máxima, datos curiosos descubiertos)', () => {
  let container;
  let addEventListenerSpy;
  let originalAudio;

  beforeAll(() => {
    // Requiring main.js self-attaches a `window.addEventListener('load', ...)`
    // bootstrap meant for the real, unbundled browser; swallow it here so it
    // never fires mid-test against these tests' own #app container.
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

    // jsdom has no real media playback; stub it out so answering questions
    // (which plays the feedback sfx) doesn't hit jsdom's "not implemented"
    // HTMLMediaElement.play() warning.
    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
    window.Audio = originalAudio;
  });

  describe('a dato curioso is discovered the instant it is revealed, before "Siguiente"', () => {
    test('a correct answer persists the stable factId immediately', () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      // A single-question bank so there is no shuffle ordering to account for.
      const questions = [buildQuestion('q-0')];
      const storage = { markFunFactDiscovered: jest.fn().mockResolvedValue(undefined) };

      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);

      const [correctButton] = container.querySelectorAll('.question-screen__option');
      correctButton.click();

      expect(storage.markFunFactDiscovered).toHaveBeenCalledWith('funFacts.q-0');
      // Registered before "Siguiente" is even clickable.
      expect(getByRole(container, 'button', { name: questionStrings.nextButton })).toBeDisabled();
    });

    test('an incorrect answer also persists it (discovery is outcome-independent)', () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = [buildQuestion('q-0')];
      const storage = { markFunFactDiscovered: jest.fn().mockResolvedValue(undefined) };

      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);

      const buttons = container.querySelectorAll('.question-screen__option');
      buttons[1].click(); // wrong answer (correctAnswerIndex is always 0)

      expect(storage.markFunFactDiscovered).toHaveBeenCalledWith('funFacts.q-0');
    });

    test('a question with no fun fact content never registers a discovery', () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = [buildQuestion('q-0', { funFact: '' })];
      const storage = { markFunFactDiscovered: jest.fn().mockResolvedValue(undefined) };

      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);

      container.querySelectorAll('.question-screen__option')[0].click();

      expect(storage.markFunFactDiscovered).not.toHaveBeenCalled();
    });

    test('showing the same fact twice keeps the discovered count at one, before and after the storage is reopened', async () => {
      const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      // Two distinct questions that happen to reveal the exact same dato curioso.
      const questions = [
        buildQuestion('q-0', { dato_curioso: 'funFacts.shared', funFact: 'Mismo dato curioso' }),
        buildQuestion('q-1', { dato_curioso: 'funFacts.shared', funFact: 'Mismo dato curioso' }),
      ];
      const backingStore = new Map();
      const storage = new DinoQuizStorage([createSharedAdapter(backingStore)]);

      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);
      await answerCurrentQuestion(container, { correct: true });
      await answerCurrentQuestion(container, { correct: true });

      expect(await storage.get('discoveredFunFacts')).toEqual(['funFacts.shared']);

      // "Reopen the app": a fresh DinoQuizStorage instance sharing the same backing store.
      const reopened = new DinoQuizStorage([createSharedAdapter(backingStore)]);
      expect(await reopened.get('discoveredFunFacts')).toEqual(['funFacts.shared']);
    });
  });

  describe('mejor puntuación / racha máxima persistence', () => {
    test('recordScore is called with the final score once the game actually completes', async () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2);
      const storage = { recordScore: jest.fn().mockResolvedValue(undefined) };

      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);
      await answerCurrentQuestion(container, { correct: true });
      expect(storage.recordScore).not.toHaveBeenCalled();

      await answerCurrentQuestion(container, { correct: true });

      expect(storage.recordScore).toHaveBeenCalledWith(2);
    });

    test('beating the historic streak persists it immediately, without needing to reach Resultados', () => {
      const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(5);
      const storage = { recordStreak: jest.fn().mockResolvedValue(undefined) };

      startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);

      // Two hits in a row (game abandoned before the 5 questions finish).
      container.querySelectorAll('.question-screen__option')[0].click();
      expect(storage.recordStreak).toHaveBeenLastCalledWith(1);

      jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
      getByRole(container, 'button', { name: questionStrings.nextButton }).click();
      container.querySelectorAll('.question-screen__option')[0].click();

      expect(storage.recordStreak).toHaveBeenLastCalledWith(2);
    });
  });

  describe('Resultados renders the three indicators without a transient false zero', () => {
    test('renders a neutral placeholder synchronously, then the real values once storage resolves', async () => {
      const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
      const { resolveScreenRenderers, renderResultsFor } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(3);
      const storage = new DinoQuizStorage([createSharedAdapter(new Map())]);
      await storage.recordScore(4);
      await storage.recordStreak(2);
      await storage.markFunFactDiscovered('funFacts.q-0');

      renderResultsFor(
        container,
        renderers,
        questions,
        { score: 5, maxStreak: 3, answers: [] },
        document,
        undefined,
        undefined,
        [],
        undefined,
        storage
      );

      // Synchronously right after render: never a fabricated 0/0/0-total.
      const before = progressText(container);
      expect(before.bestScore).not.toMatch(/: 0\/10$/);
      expect(before.bestScore).toContain(progressStrings.pendingValue);
      expect(before.maxStreak).toContain(progressStrings.pendingValue);
      expect(before.discovered).toBe(`Descubiertos …/${questions.length}`);

      await flushPromises();

      const after = progressText(container);
      expect(after.bestScore).toBe('Mejor puntuación: 4/10');
      expect(after.maxStreak).toBe('Racha máxima: 2');
      expect(after.discovered).toBe(`Descubiertos 1/${questions.length}`);
    });
  });

  describe('empty install: safe initial values everywhere', () => {
    test('Resultados shows bestScore 0, maxStreak 0 and Descubiertos 0/Y with no prior storage', async () => {
      const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
      const { resolveScreenRenderers, renderResultsFor } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(4);
      const storage = new DinoQuizStorage([createSharedAdapter(new Map())]);

      renderResultsFor(
        container,
        renderers,
        questions,
        { score: 0, maxStreak: 0, answers: [] },
        document,
        undefined,
        undefined,
        [],
        undefined,
        storage
      );

      await flushPromises();

      expect(progressText(container)).toEqual({
        bestScore: 'Mejor puntuación: 0/10',
        maxStreak: 'Racha máxima: 0',
        discovered: 'Descubiertos 0/4',
      });
    });

    test('malformed/unknown/duplicate preloaded ids do not inflate the discovered count shown', async () => {
      const { DinoQuizStorage } = require('../../src/services/storage/StorageClient');
      const { resolveScreenRenderers, renderResultsFor } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = buildQuestionBank(2); // catalog: funFacts.q-0, funFacts.q-1
      const backingStore = new Map();
      backingStore.set(
        'dinoquiz:discoveredFunFacts',
        JSON.stringify(['funFacts.q-0', 'funFacts.q-0', 'funFacts.unknown-from-old-catalog', null, 42])
      );
      const storage = new DinoQuizStorage([createSharedAdapter(backingStore)]);

      renderResultsFor(
        container,
        renderers,
        questions,
        { score: 0, maxStreak: 0, answers: [] },
        document,
        undefined,
        undefined,
        [],
        undefined,
        storage
      );

      await flushPromises();

      expect(progressText(container).discovered).toBe('Descubiertos 1/2');
    });
  });

  describe('offline round trip: reveal a fact -> save progress -> navigate -> reopen -> recover', () => {
    // No custom storage is injected below -- renderHome/onExit resolve their
    // own backend via resolveHomeStorage() exactly like the real app does
    // (see main.js), which in this jsdom test environment lands on the real
    // `dinoQuizStorage` singleton's localStorage adapter (jsdom has no
    // indexedDB, so it falls back the same way the real fallback chain
    // would on a browser without IndexedDB support). That backend persists
    // into jsdom's real, in-memory `window.localStorage`, so re-requiring
    // main.js/src/services/storage after `jest.resetModules()` still reads
    // the same values back -- a faithful, no-network simulation of closing
    // and reopening the installed PWA on the same device.
    const questions = [
      buildQuestion('q-0', { dato_curioso: 'funFacts.a' }),
      buildQuestion('q-1', { dato_curioso: 'funFacts.b' }),
    ];
    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings, progress: progressStrings }),
    });

    afterEach(() => {
      window.localStorage.clear();
    });

    test('the three indicators survive Quiz -> Resultados -> Salir -> Inicio, and again after the app is reopened', async () => {
      jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

      // --- First session: empty install ---
      const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();

      await renderHome(document, renderers.renderHomeScreen, fetchFn);
      expect(progressText(container)).toEqual({
        bestScore: 'Mejor puntuación: 0/10',
        maxStreak: 'Racha máxima: 0',
        discovered: 'Descubiertos 0/2',
      });

      getByRole(container, 'button', { name: homeStrings.playButton }).click();

      // Answer both questions correctly: reveals both facts, final score 2, racha 2.
      await answerCurrentQuestion(container, { correct: true });
      await answerCurrentQuestion(container, { correct: true });

      expect(container.querySelector('.results-screen')).not.toBeNull();
      await flushPromises();

      expect(progressText(container)).toEqual({
        bestScore: 'Mejor puntuación: 2/10',
        maxStreak: 'Racha máxima: 2',
        discovered: 'Descubiertos 2/2',
      });

      // Back to Inicio in the same session: still up to date, no manual reload.
      getByRole(container, 'button', { name: strings.exitButton }).click();
      await flushPromises();

      expect(progressText(container)).toEqual({
        bestScore: 'Mejor puntuación: 2/10',
        maxStreak: 'Racha máxima: 2',
        discovered: 'Descubiertos 2/2',
      });

      // --- "Reopen the app": fresh modules, same underlying (jsdom) localStorage ---
      jest.resetModules();
      jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);
      const { renderHome: renderHomeAgain, resolveScreenRenderers: resolveScreenRenderersAgain } = require(MAIN_JS_PATH);

      container.innerHTML = '';
      await renderHomeAgain(document, resolveScreenRenderersAgain().renderHomeScreen, fetchFn);

      expect(progressText(container)).toEqual({
        bestScore: 'Mejor puntuación: 2/10',
        maxStreak: 'Racha máxima: 2',
        discovered: 'Descubiertos 2/2',
      });
    });

    test('a clean install (no prior storage) shows the safe initial values on Inicio', async () => {
      jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);
      const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);

      await renderHome(document, resolveScreenRenderers().renderHomeScreen, fetchFn);

      expect(progressText(container)).toEqual({
        bestScore: 'Mejor puntuación: 0/10',
        maxStreak: 'Racha máxima: 0',
        discovered: 'Descubiertos 0/2',
      });
    });
  });
});
