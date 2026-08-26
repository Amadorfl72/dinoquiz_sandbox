'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-111: covers the PRD's "sin conexión confirmada" scenario end to
 * end — the question bank must load from the local JSON file (never a
 * network fetch), and a full game (Inicio -> Quiz de 10 preguntas ->
 * Resultados -> Volver a jugar) must be playable start to finish with the
 * device reporting no network connectivity at all.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const i18n = require('../../public/i18n/es.json');
const { results: resultsStrings, question: questionStrings } = i18n;
const { MIN_ADVANCE_DELAY_MS } = require('../../src/screens/QuestionScreen');
const { EXPECTED_QUESTION_COUNT } = require('../../src/data/questionBank');
const { QUESTIONS_PER_GAME } = require('../../src/game/questionSelector');

/** Mirrors the real browser bootstrap: resolves each question's dato_curioso i18n key into `funFact`. */
function prepareQuestions(rawQuestions) {
  return require(MAIN_JS_PATH).prepareBrowserQuestions(rawQuestions, i18n);
}

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

/** Answers the question currently on screen with its correct option, then advances. */
function answerCurrentQuestionCorrectly(container, session) {
  const question = session.questions[session.state.questionIndex];
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  buttons[question.correctAnswerIndex].click();
  // "Siguiente" stays disabled for MIN_ADVANCE_DELAY_MS (AC-6) so the dato
  // curioso is readable — fast-forward past it for the test.
  jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

describe('TRIOFSND-111: el banco de preguntas se carga del JSON local, nunca por red', () => {
  let originalFetch;
  let hadOwnFetch;

  beforeEach(() => {
    jest.resetModules();
    hadOwnFetch = Object.prototype.hasOwnProperty.call(global, 'fetch');
    originalFetch = global.fetch;
    goOffline();
  });

  afterEach(() => {
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  });

  test('loadQuestionBank reads the 40-question bank straight from disk and never calls fetch, even while offline', () => {
    global.fetch = rejectingFetch();

    expect(window.navigator.onLine).toBe(false);

    const { loadQuestionBank } = require('../../src/data/questionBank');
    const questions = loadQuestionBank();

    expect(questions).toHaveLength(EXPECTED_QUESTION_COUNT);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("main.js's loadQuestions() (Node/Jest path) resolves the same local bank without ever touching fetch", () => {
    global.fetch = rejectingFetch();

    const { loadQuestions } = require(MAIN_JS_PATH);
    const questions = loadQuestions();

    expect(questions).toHaveLength(EXPECTED_QUESTION_COUNT);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('TRIOFSND-111: partida completa offline — Inicio -> Quiz (10 preguntas) -> Resultados -> Volver a jugar', () => {
  let container;
  let hadOwnFetch;
  let originalFetch;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    hadOwnFetch = Object.prototype.hasOwnProperty.call(global, 'fetch');
    originalFetch = global.fetch;
    goOffline();
  });

  afterEach(() => {
    container.remove();
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  });

  test('a whole game plays through with the device offline, using only the local question bank', () => {
    // Simulates a real device with no connectivity at all: any ambient
    // fetch() (not the explicit fetchFn passed below) must fail loudly.
    global.fetch = rejectingFetch();

    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const { loadQuestionBank } = require('../../src/data/questionBank');

    const renderers = resolveScreenRenderers();
    // The real 40-question local bank (public/data/questions.json), loaded
    // via fs — exactly what the app plays with on a real device.
    const questions = prepareQuestions(loadQuestionBank());
    expect(questions).toHaveLength(EXPECTED_QUESTION_COUNT);

    jest.useFakeTimers();
    let session;
    try {
      session = startNewGame(container, renderers, questions, document, undefined, Math.random);
      expect(session.questions).toHaveLength(QUESTIONS_PER_GAME);

      for (let i = 0; i < QUESTIONS_PER_GAME; i += 1) {
        expect(container.querySelector('.question-screen')).not.toBeNull();
        answerCurrentQuestionCorrectly(container, session);
      }
    } finally {
      jest.useRealTimers();
    }

    // Resultados: every answer was correct, so 10/10 and 3 stars.
    expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
    expect(container.textContent).toContain('10/10');
    expect(container.querySelector('.results-screen__stars')).toHaveAttribute(
      'aria-label',
      resultsStrings.starsLabel.replace('{stars}', '3').replace('{maxStars}', '3')
    );
    expect(container.querySelector('.results-screen__message')).not.toBeNull();

    // "Volver a jugar" (AC-9): a fresh game starts, still fully offline.
    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();
    expect(container.querySelector('.question-screen')).not.toBeNull();
    expect(container.querySelector('.results-screen')).toBeNull();
    expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a missed answer never blocks the offline flow: the correct option and a dato curioso are still shown before advancing', () => {
    global.fetch = rejectingFetch();

    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const { loadQuestionBank } = require('../../src/data/questionBank');

    const renderers = resolveScreenRenderers();
    const questions = prepareQuestions(loadQuestionBank());

    jest.useFakeTimers();
    try {
      const session = startNewGame(container, renderers, questions, document, undefined, Math.random);
      const firstQuestion = session.questions[0];
      const wrongIndex = firstQuestion.correctAnswerIndex === 0 ? 1 : 0;

      const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
      buttons[wrongIndex].click();

      expect(container.querySelector('.question-screen__fun-fact-box')).not.toHaveAttribute('hidden');
      expect(container.querySelector('.question-screen__fun-fact').textContent).toBe(firstQuestion.funFact);
      expect(
        container.querySelectorAll('.question-screen__option--correct')[0]
      ).toBe(buttons[firstQuestion.correctAnswerIndex]);
      expect(container.textContent).toContain(`${questionStrings.scoreLabel}: 0`);
    } finally {
      jest.useRealTimers();
    }

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
