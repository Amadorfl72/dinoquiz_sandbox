'use strict';

/**
 * TRIOFSND-196: end-to-end coverage for the age gate wired into the
 * "¡Jugar!" flow (public/scripts/main.js).
 *
 * public/scripts/main.js already renders the age gate (ageGateScreen.js,
 * TRIOFSND-193) right after '¡Jugar!' and before `startNewGame` prepares the
 * game, and "Volver a jugar" replays via `startNewGame` directly -- it never
 * re-renders the age gate, so the in-memory, session-only selection
 * (ageGateScreen.js's `selectedAgeBand`) is what makes the image style
 * (TRIOFSND-194) stay consistent across replays without asking again. This
 * file exercises that whole path end to end (rather than injecting
 * `options.ageBand` directly, as src/screens/QuestionScreen.test.js does) and
 * adds the privacy guarantee the PRD (G7) requires: the age/age band must
 * never appear in a console log call, a `fetch` call or any write to the
 * storage backend across the full Inicio -> Quiz -> Resultados -> Volver a
 * jugar/Salir loop.
 */

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const {
  home: homeStrings,
  ageGate: ageGateStrings,
  results: resultsStrings,
  question: questionStrings,
} = require('../../public/i18n/es.json');

// `level` defaults to 1 (TRIOFSND-207's multi-level orchestration reads it
// from every question) so every existing single-level scenario here still
// gets a single, always-valid level-1 pool.
function buildQuestion(id, level) {
  return {
    id,
    dinosaur: 'trex',
    question: `Pregunta ${id}`,
    options: ['A', 'B', 'C'],
    correctAnswerIndex: 0,
    funFact: `Dato curioso ${id}`,
    image: 'dinosaurs/trex.png',
    imageRealistic: 'dinosaurs/realista/trex.png',
    level: level || 1,
  };
}

function buildQuestionBank(count, level) {
  return Array.from({ length: count }, (_, index) => buildQuestion(`q-${index}`, level));
}

/** A flat bank covering every level in `levels` (10 questions each), for scenarios that unlock past level 1. */
function buildLeveledQuestionBank(levels) {
  return levels.reduce(
    (all, level) => all.concat(buildQuestionBank(10, level).map((question, index) => ({ ...question, id: `q-l${level}-${index}` }))),
    []
  );
}

async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

function currentImageSrc(container) {
  return container.querySelector('.question-screen__image').src;
}

function mockHomeFetch() {
  return jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: homeStrings }) });
}

describe('TRIOFSND-196: age gate integrated into the "¡Jugar!" flow (image style + session persistence)', () => {
  let container;
  let addEventListenerSpy;
  let originalAudio;

  beforeAll(() => {
    // Same rationale as tests/pwa/game-flow.test.js: main.js self-attaches a
    // `window.addEventListener('load', ...)` bootstrap on require, which
    // races jsdom's own deferred 'load' dispatch against fake timers here.
    // These tests drive renderHome/startNewGame directly, so swallow it.
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
    // Screens/services register themselves on `window.DinoQuiz` too (the
    // no-bundler browser path), and jsdom's `window` survives across tests
    // in this file while jest.resetModules() only clears Node's require
    // cache -- without this, `resolveScreenRenderers()` would keep resolving
    // a *previous* test's stale module instance (see resolveScreenRenderers'
    // `fromWindow.renderAgeGateScreen || require(...)` preference in
    // main.js), splitting a single test's age-band selection across two
    // different AgeGateScreen module instances.
    delete window.DinoQuiz;
    jest.resetModules();
    jest.useFakeTimers();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    // jsdom has no real media playback; stub it out like game-flow.test.js.
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

  async function startFromHome(questions) {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    const rendered = renderHome(document, renderers.renderHomeScreen, mockHomeFetch());
    jest.advanceTimersByTime(0);
    await rendered;
  }

  test('el age gate nunca ofrece una opción de "6 años": solo existen "7 años o menos" y "8 años o más"', async () => {
    await startFromHome(buildQuestionBank(10));

    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    expect(ageGateStrings.sixOption).toBeUndefined();
    expect(container.querySelector('.age-gate-screen__option--six')).toBeNull();
    expect(container.textContent).not.toContain('6 años');
    expect(container.querySelectorAll('.age-gate-screen__option').length).toBe(2);
    expect(getByRole(container, 'button', { name: ageGateStrings.sevenOption })).not.toBeNull();
    expect(getByRole(container, 'button', { name: ageGateStrings.eightPlusOption })).not.toBeNull();
  });

  test('7 años o menos ven la variante de imagen realista', async () => {
    await startFromHome(buildQuestionBank(10));

    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    getByRole(container, 'button', { name: ageGateStrings.sevenOption }).click();

    expect(container.querySelector('.question-screen')).not.toBeNull();
    expect(currentImageSrc(container)).toContain('dinosaurs/realista/trex.png');
  });

  test('8 años o más ven la variante de imagen realista', async () => {
    await startFromHome(buildQuestionBank(10));

    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    getByRole(container, 'button', { name: ageGateStrings.eightPlusOption }).click();

    expect(container.querySelector('.question-screen')).not.toBeNull();
    expect(currentImageSrc(container)).toContain('dinosaurs/realista/trex.png');
  });

  test('la selección de edad persiste entre partidas de la misma sesión: "Volver a jugar" no vuelve a preguntar y conserva el estilo de imagen', async () => {
    const questions = buildQuestionBank(10);
    await startFromHome(questions);

    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    getByRole(container, 'button', { name: ageGateStrings.sevenOption }).click();
    expect(currentImageSrc(container)).toContain('/realista/');

    for (let i = 0; i < 10; i += 1) {
      await answerCurrentQuestion(container, { correct: true });
    }
    // TRIOFSND-207: finishing a level persists/reads maxUnlockedLevel through
    // the (Promise-based) storage service before Resultados renders.
    await jest.advanceTimersByTimeAsync(0);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();

    // No re-prompt: straight back to a question screen, same (realista) style.
    expect(container.querySelector('.age-gate-screen')).toBeNull();
    expect(container.querySelector('.question-screen')).not.toBeNull();
    expect(currentImageSrc(container)).toContain('/realista/');
  });

  test('una selección de "8 años o más" también persiste sin volver a preguntar tras "Volver a jugar"', async () => {
    // TRIOFSND-207: 10/10 aciertos as an 8+ year old unlocks level 2 (>=6
    // aciertos), so "Volver a jugar" here continues straight into it -- a
    // second level's worth of questions must exist for that to succeed.
    const questions = buildLeveledQuestionBank([1, 2]);
    await startFromHome(questions);

    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    getByRole(container, 'button', { name: ageGateStrings.eightPlusOption }).click();
    expect(currentImageSrc(container)).toContain('/realista/');

    for (let i = 0; i < 10; i += 1) {
      await answerCurrentQuestion(container, { correct: true });
    }
    // TRIOFSND-207: finishing a level persists/reads maxUnlockedLevel through
    // the (Promise-based) storage service before Resultados renders.
    await jest.advanceTimersByTimeAsync(0);

    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();

    expect(container.querySelector('.age-gate-screen')).toBeNull();
    expect(currentImageSrc(container)).toContain('/realista/');
  });
});

describe('TRIOFSND-196: privacidad — ni la edad ni el grupo de edad viajan por logs o red', () => {
  // Deliberately generic/lowercase substrings (never the bare "age", which
  // would also match unrelated words like "image"/"storage"/"message") so a
  // future accidental `console.log(ageBand)`, a `fetch` payload embedding it,
  // or a storage write keyed by it, all get caught regardless of casing.
  const FORBIDDEN_SUBSTRINGS = ['edad', 'ageband', 'age-band', 'age_band', 'seven', 'eight-plus'];

  function assertNoAgeLeak(callsArgs) {
    const serialized = JSON.stringify(callsArgs, (key, value) => (typeof value === 'function' ? '[fn]' : value)) || '';
    const normalized = serialized.toLowerCase();
    FORBIDDEN_SUBSTRINGS.forEach((needle) => {
      expect(normalized).not.toContain(needle);
    });
  }

  let container;
  let addEventListenerSpy;
  let originalAudio;
  let consoleSpies;

  beforeAll(() => {
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
    // See the sibling describe block above for why this must be cleared too.
    delete window.DinoQuiz;
    jest.resetModules();
    jest.useFakeTimers();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };

    consoleSpies = ['log', 'info', 'warn', 'error', 'debug']
      .filter((method) => typeof console[method] === 'function')
      .map((method) => jest.spyOn(console, method).mockImplementation(() => {}));
  });

  afterEach(() => {
    consoleSpies.forEach((spy) => spy.mockRestore());
    jest.useRealTimers();
    container.remove();
    window.Audio = originalAudio;
  });

  test('el flujo completo (Inicio -> age gate -> Quiz -> Resultados -> Volver a jugar -> Salir) nunca expone la edad/grupo de edad en logs, red o almacenamiento', async () => {
    const questions = buildQuestionBank(10);
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings, results: resultsStrings, ageGate: ageGateStrings }),
    });

    const memory = {};
    // A single duck-typed backend covering every interface renderHome/
    // startNewGame can write through (tooltip+analytics, mute/purchase
    // getItem/setItem, per-question stats) so every possible write point is
    // captured by one set of spies.
    const storage = {
      hasSeenHomeTooltip: jest.fn().mockResolvedValue(true),
      markHomeTooltipSeen: jest.fn().mockResolvedValue(undefined),
      recordEventOnce: jest.fn().mockResolvedValue(1),
      recordEvent: jest.fn().mockResolvedValue(1),
      recordQuestionAnswered: jest.fn().mockResolvedValue({ total_respuestas: 1, total_aciertos: 1 }),
      getItem: jest.fn((key) => (Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null)),
      setItem: jest.fn((key, value) => {
        memory[key] = value;
      }),
    };

    const rendered = renderHome(document, renderers.renderHomeScreen, fetchFn, storage);
    jest.advanceTimersByTime(0);
    await rendered;

    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    getByRole(container, 'button', { name: ageGateStrings.sevenOption }).click();

    for (let i = 0; i < 10; i += 1) {
      await answerCurrentQuestion(container, { correct: i % 2 === 0 });
    }
    // TRIOFSND-207: finishing a level persists/reads maxUnlockedLevel through
    // the (Promise-based) storage service before Resultados renders.
    await jest.advanceTimersByTimeAsync(0);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();
    expect(container.querySelector('.age-gate-screen')).toBeNull();

    for (let i = 0; i < 10; i += 1) {
      await answerCurrentQuestion(container, { correct: true });
    }
    await jest.advanceTimersByTimeAsync(0);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    getByRole(container, 'button', { name: resultsStrings.exitButton }).click();
    await jest.advanceTimersByTimeAsync(0);
    expect(getByRole(container, 'button', { name: homeStrings.playButton })).toBeInTheDocument();

    // Network: every fetch() call made during the whole flow.
    assertNoAgeLeak(fetchFn.mock.calls);

    // Client-side persistence (this app has no backend -- these calls are
    // the closest thing to "network" writes it performs, see CONVENTIONS.md).
    assertNoAgeLeak(storage.setItem.mock.calls);
    assertNoAgeLeak(storage.getItem.mock.calls);
    assertNoAgeLeak(storage.recordEvent.mock.calls);
    assertNoAgeLeak(storage.recordEventOnce.mock.calls);
    assertNoAgeLeak(storage.recordQuestionAnswered.mock.calls);
    assertNoAgeLeak(storage.markHomeTooltipSeen.mock.calls);
    assertNoAgeLeak(Object.keys(memory).map((key) => [key, memory[key]]));

    // Logs.
    consoleSpies.forEach((spy) => assertNoAgeLeak(spy.mock.calls));
  });
});
