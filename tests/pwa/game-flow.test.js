'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
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

function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
  // "Siguiente" stays disabled for MIN_ADVANCE_DELAY_MS (AC-6) so the dato
  // curioso is readable; fake timers let these flow tests fast-forward past it.
  jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

describe('TRIOFSND-100: app-shell navigation Quiz -> Resultados -> Volver a jugar / Salir', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
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

  test('startNewGame walks through every question and lands on Resultados with the right score', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);

    startNewGame(container, renderers, questions, document, undefined, () => 0);

    for (let i = 0; i < 10; i += 1) {
      answerCurrentQuestion(container, { correct: true });
    }

    expect(getByRole(container, 'heading', { name: strings.heading })).toBeInTheDocument();
    expect(container.textContent).toContain('10/10');
  });

  test('"Volver a jugar" resets game state and navigates to the first question of a new game', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);

    // First game: get every answer wrong (score stays 0), reach Resultados.
    startNewGame(container, renderers, questions, document, undefined, () => 0);
    for (let i = 0; i < 10; i += 1) {
      answerCurrentQuestion(container, { correct: false });
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
      answerCurrentQuestion(container, { correct: true });
    }
    expect(container.textContent).toContain('10/10');
  });

  test('"Salir" navigates back to Inicio', async () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const { home: homeStrings } = require('../../public/i18n/es.json');

    startNewGame(container, renderers, questions, document, undefined, () => 0);
    for (let i = 0; i < 10; i += 1) {
      answerCurrentQuestion(container, { correct: true });
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
});

describe('TRIOFSND-92: pregunta_respondida aggregates acierto/fallo per id_pregunta, no per-child log', () => {
  let container;

  function createFakeAnalyticsStorage() {
    return { recordQuestionAnswered: jest.fn().mockResolvedValue(undefined) };
  }

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    container.remove();
    jest.useRealTimers();
  });

  test('answering a question records the aggregated result against that question id', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeAnalyticsStorage();

    startNewGame(container, renderers, questions, document, undefined, () => 0, storage);
    answerCurrentQuestion(container, { correct: false });

    expect(storage.recordQuestionAnswered).toHaveBeenCalledWith('q-0', false);
  });

  test('a full game records one aggregated call per question, in order, with no cross-question mixing', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeAnalyticsStorage();

    startNewGame(container, renderers, questions, document, undefined, () => 0, storage);
    for (let i = 0; i < 10; i += 1) {
      answerCurrentQuestion(container, { correct: i % 2 === 0 });
    }

    expect(storage.recordQuestionAnswered).toHaveBeenCalledTimes(10);
    for (let i = 0; i < 10; i += 1) {
      expect(storage.recordQuestionAnswered).toHaveBeenNthCalledWith(i + 1, `q-${i}`, i % 2 === 0);
    }
  });

  test('"Volver a jugar" keeps recording aggregated results for the replayed game', () => {
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildQuestionBank(10);
    const storage = createFakeAnalyticsStorage();

    startNewGame(container, renderers, questions, document, undefined, () => 0, storage);
    for (let i = 0; i < 10; i += 1) {
      answerCurrentQuestion(container, { correct: true });
    }

    const { results: resultsStrings } = require('../../public/i18n/es.json');
    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();
    // The replay picks a fresh random subset (AC-9), so read back whichever
    // question actually landed first rather than assuming a fixed id.
    const replayedQuestionId = getByRole(container, 'heading', { level: 2 }).textContent.replace('Pregunta ', '');
    answerCurrentQuestion(container, { correct: false });

    expect(storage.recordQuestionAnswered).toHaveBeenCalledTimes(11);
    expect(storage.recordQuestionAnswered).toHaveBeenNthCalledWith(11, replayedQuestionId, false);
  });

  test('resolveAnalyticsStorage falls back to the shared DinoQuizStorage instance when no override is given', () => {
    const { resolveAnalyticsStorage, loadDinoQuizStorage } = require(MAIN_JS_PATH);

    expect(resolveAnalyticsStorage()).toBe(loadDinoQuizStorage());
  });

  test('resolveAnalyticsStorage returns the explicit override untouched', () => {
    const { resolveAnalyticsStorage } = require(MAIN_JS_PATH);
    const storage = createFakeAnalyticsStorage();

    expect(resolveAnalyticsStorage(storage)).toBe(storage);
  });
});
