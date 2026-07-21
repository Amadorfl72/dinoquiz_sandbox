'use strict';

// TRIOFSND-92 (adapted onto main's structure): the aggregated, non-PII
// acierto/fallo tally per id_pregunta flows through the single TRIOFSND-80
// write point `storage.recordQuestionAnswered` (10th `startNewGame` arg);
// `DinoQuizStorage.recordQuestionResult`/`getQuestionResults`/
// `getQuestionFailureRate` expose the acierto/fallo view over that same
// `questionStats` aggregate (see StorageClient.test.js). Kept in its own
// file so the flow assertions run against a fresh jsdom document.

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const { question: questionStrings } = require('../../public/i18n/es.json');

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
// "Siguiente" (see tests/pwa/game-flow.test.js for the same helper).
async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

describe('TRIOFSND-92: pregunta_respondida aggregates acierto/fallo per id_pregunta, no per-child log', () => {
  let container;
  let originalAudio;
  let addEventListenerSpy;

  beforeAll(() => {
    // Same guard as the first describe above: requiring main.js self-attaches
    // a `window.addEventListener('load', ...)` bootstrap that advancing fake
    // timers can trigger mid-test, clobbering #app. Swallow it.
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

  // Adapted to main's structure: the single write point for the aggregated,
  // non-PII acierto/fallo tally is `storage.recordQuestionAnswered(id,
  // acierto)` (TRIOFSND-80's per-question client, 10th `startNewGame` arg);
  // `DinoQuizStorage.recordQuestionResult`/`getQuestionResults` expose the
  // acierto/fallo view over that same aggregate (see StorageClient.test.js).
  function createFakeQuestionStorage() {
    return {
      recordQuestionAnswered: jest.fn().mockResolvedValue({ total_respuestas: 1, total_aciertos: 0, porcentaje_acierto: 0 }),
    };
  }

  function startGameWith(container, renderers, questions, storage) {
    const { startNewGame } = require(MAIN_JS_PATH);
    startNewGame(container, renderers, questions, document, undefined, () => 0, undefined, undefined, undefined, storage);
  }

  // The selection engine (TRIOFSND-101) picks a shuffled subset, so tests
  // read back whichever question actually rendered instead of assuming order.
  function currentQuestionId(container) {
    return getByRole(container, 'heading', { level: 2 }).textContent.replace('Pregunta ', '');
  }

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    jest.useFakeTimers();

    // jsdom has no real media playback; stub it out so answering questions
    // here (which plays the TRIOFSND-78 feedback sfx) doesn't hit jsdom's
    // "not implemented" HTMLMediaElement.play() warning.
    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    container.remove();
    jest.useRealTimers();
    window.Audio = originalAudio;
  });

  test('a wrong answer increments the fallo aggregate for that question\'s id_pregunta', async () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeQuestionStorage();

    startGameWith(container, renderers, questions, storage);
    const answeredId = currentQuestionId(container);
    await answerCurrentQuestion(container, { correct: false });

    expect(storage.recordQuestionAnswered).toHaveBeenCalledWith(answeredId, false);
  });

  test('a correct answer increments the acierto aggregate and never the fallo one', async () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeQuestionStorage();

    startGameWith(container, renderers, questions, storage);
    const answeredId = currentQuestionId(container);
    await answerCurrentQuestion(container, { correct: true });

    expect(storage.recordQuestionAnswered).toHaveBeenCalledWith(answeredId, true);
    expect(storage.recordQuestionAnswered).not.toHaveBeenCalledWith(answeredId, false);
  });

  test('a question without a valid id_pregunta is skipped and does not break the quiz flow', async () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10).map((question) => ({ ...question, id: undefined }));
    const storage = createFakeQuestionStorage();

    startGameWith(container, renderers, questions, storage);
    await answerCurrentQuestion(container, { correct: false });

    expect(storage.recordQuestionAnswered).not.toHaveBeenCalled();
    expect(container.querySelector('.question-screen')).not.toBeNull();
  });

  test('repeated taps on the same or another option after answering do not record a second time', () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeQuestionStorage();

    startGameWith(container, renderers, questions, storage);
    const answeredId = currentQuestionId(container);
    const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
    buttons[1].click();
    buttons[1].click();
    buttons[0].click();

    expect(storage.recordQuestionAnswered).toHaveBeenCalledTimes(1);
    expect(storage.recordQuestionAnswered).toHaveBeenCalledWith(answeredId, false);
  });

  test('a full game records one aggregated call per question, in order, with no cross-question mixing', async () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeQuestionStorage();

    startGameWith(container, renderers, questions, storage);
    const answeredIds = [];
    for (let i = 0; i < 10; i += 1) {
      answeredIds.push(currentQuestionId(container));
      await answerCurrentQuestion(container, { correct: i % 2 === 0 });
    }

    expect(storage.recordQuestionAnswered).toHaveBeenCalledTimes(10);
    for (let i = 0; i < 10; i += 1) {
      expect(storage.recordQuestionAnswered).toHaveBeenNthCalledWith(i + 1, answeredIds[i], i % 2 === 0);
    }
  });

  test('"Volver a jugar" keeps recording aggregated results for the replayed game', async () => {
    const { resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeQuestionStorage();

    startGameWith(container, renderers, questions, storage);
    for (let i = 0; i < 10; i += 1) {
      await answerCurrentQuestion(container, { correct: true });
    }

    const { results: resultsStrings } = require('../../public/i18n/es.json');
    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();
    // The replay picks a fresh random subset (AC-9), so read back whichever
    // question actually landed first rather than assuming a fixed id.
    const replayedQuestionId = currentQuestionId(container);
    await answerCurrentQuestion(container, { correct: false });

    expect(storage.recordQuestionAnswered).toHaveBeenCalledTimes(11);
    expect(storage.recordQuestionAnswered).toHaveBeenNthCalledWith(11, replayedQuestionId, false);
  });
});
