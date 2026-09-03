'use strict';

/**
 * Nickname ("apodo") step integrated into the "¡Jugar!" flow
 * (public/scripts/main.js): a nickname already saved on this device
 * (nicknameService.js's `dinoquiz:nickname`) is reused silently, skipping
 * the request screen entirely; with none saved, the screen is shown right
 * after '¡Jugar!', before the age gate and before the first question, and
 * both its exits ("Continuar" with a valid apodo, or "Jugar como invitado")
 * lead into the rest of the existing flow untouched.
 *
 * Also covers the Hall of Fame side (hallOfFameService.js): a finished game
 * records `{ name, score, timestamp }` using whichever nickname is saved at
 * that point (or `name: null` for a guest game) -- and confirms the name
 * never reaches any analytics/log call (PRD G7).
 */

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const {
  home: homeStrings,
  ageGate: ageGateStrings,
  nicknameRequest: nicknameStrings,
  question: questionStrings,
} = require('../../public/i18n/es.json');

function buildQuestion(id) {
  return {
    id,
    dinosaur: 'trex',
    question: `Pregunta ${id}`,
    options: ['A', 'B', 'C'],
    correctAnswerIndex: 0,
    funFact: `Dato curioso ${id}`,
    image: 'dinosaurs/trex.png',
    level: 1,
  };
}

function buildQuestionBank(count) {
  return Array.from({ length: count }, (_, index) => buildQuestion(`q-${index}`));
}

function selectQuizMode(container) {
  getByRole(container, 'button', { name: ageGateStrings.eightPlusOption }).click();
  container.querySelector('[data-mode-id="quiz"]').click();
}

async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1;
  buttons[index].click();
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

// Deliberately mixed hits/misses (5/10): a perfect 10/10 on a single-level
// bank unlocks a level 2 that doesn't exist here, which safe-exits to Inicio
// instead of showing Resultados (see gameFlow.js's level-unlock threshold) --
// same rationale as tests/pwa/age-gate-flow.test.js's own privacy scenario.
async function playFullGame(container) {
  for (let i = 0; i < 10; i += 1) {
    await answerCurrentQuestion(container, { correct: i % 2 === 0 });
  }
  await jest.advanceTimersByTimeAsync(0);
}

function mockHomeFetch() {
  return jest.fn().mockResolvedValue({ json: () => Promise.resolve({ home: homeStrings }) });
}

describe('nickname step integrated into the "¡Jugar!" flow', () => {
  let container;
  let addEventListenerSpy;
  let originalAudio;

  beforeAll(() => {
    // main.js self-attaches a `window.addEventListener('load', ...)`
    // bootstrap on require, which races jsdom's own deferred 'load' dispatch
    // against fake timers here -- same rationale as tests/pwa/game-flow.test.js.
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
    delete window.DinoQuiz;
    jest.resetModules();
    jest.useFakeTimers();
    window.localStorage.clear();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
    window.Audio = originalAudio;
    window.localStorage.clear();
  });

  async function startFromHome(questions) {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    const rendered = renderHome(document, renderers.renderHomeScreen, mockHomeFetch());
    jest.advanceTimersByTime(0);
    await rendered;
  }

  test('sin apodo guardado, la pantalla se muestra justo después de "¡Jugar!" y antes del age gate', async () => {
    await startFromHome(buildQuestionBank(10));

    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    expect(getByRole(container, 'heading', { name: nicknameStrings.screenTitle })).toBeInTheDocument();
    expect(container.querySelector('.age-gate-screen')).toBeNull();
  });

  test('un apodo ya guardado hace que la pantalla se salte y se vaya directo al age gate', async () => {
    const { saveNickname } = require('../../src/services/nicknameService');
    saveNickname('Rex');

    await startFromHome(buildQuestionBank(10));
    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    expect(container.querySelector('.nickname-screen')).toBeNull();
    expect(container.querySelector('.age-gate-screen')).not.toBeNull();
  });

  test('"Continuar" con un apodo válido lo persiste y avanza al age gate', async () => {
    await startFromHome(buildQuestionBank(10));
    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    const input = container.querySelector('.nickname-screen__input');
    input.value = 'Rex';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    getByRole(container, 'button', { name: nicknameStrings.continueButtonLabel }).click();

    expect(container.querySelector('.age-gate-screen')).not.toBeNull();
    const { getNickname } = require('../../src/services/nicknameService');
    expect(getNickname()).toBe('Rex');
  });

  test('"Jugar como invitado" avanza sin guardar ningún apodo', async () => {
    await startFromHome(buildQuestionBank(10));
    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    getByRole(container, 'button', { name: nicknameStrings.guestButtonLabel }).click();

    expect(container.querySelector('.age-gate-screen')).not.toBeNull();
    const { getNickname } = require('../../src/services/nicknameService');
    expect(getNickname()).toBeNull();
  });

  test('una partida terminada como invitado registra una entrada del Salón de la Fama con name: null', async () => {
    await startFromHome(buildQuestionBank(10));
    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    getByRole(container, 'button', { name: nicknameStrings.guestButtonLabel }).click();
    selectQuizMode(container);

    await playFullGame(container);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    const { getEntries } = require('../../src/services/hallOfFameService');
    const entries = getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ name: null, score: 5 });
  });

  test('una partida terminada con apodo guardado registra esa misma entrada en el Salón de la Fama', async () => {
    await startFromHome(buildQuestionBank(10));
    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    const input = container.querySelector('.nickname-screen__input');
    input.value = 'Rex';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    getByRole(container, 'button', { name: nicknameStrings.continueButtonLabel }).click();
    selectQuizMode(container);

    await playFullGame(container);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    const { getEntries } = require('../../src/services/hallOfFameService');
    const entries = getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ name: 'Rex', score: 5 });
  });
});

describe('privacidad: el apodo nunca viaja por eventos de analítica/logging', () => {
  let container;
  let addEventListenerSpy;
  let originalAudio;

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
    delete window.DinoQuiz;
    jest.resetModules();
    jest.useFakeTimers();
    window.localStorage.clear();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
    window.Audio = originalAudio;
    window.localStorage.clear();
  });

  test('el nombre nunca aparece en un recordEvent/recordEventOnce/recordQuestionAnswered de la sesión de storage', async () => {
    const NICKNAME = 'RexElRapido';
    const questions = buildQuestionBank(10);
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(questions);

    const fetchFn = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ home: homeStrings, ageGate: ageGateStrings, nicknameRequest: nicknameStrings }),
    });

    const memory = {};
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
    const input = container.querySelector('.nickname-screen__input');
    input.value = NICKNAME;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    getByRole(container, 'button', { name: nicknameStrings.continueButtonLabel }).click();
    selectQuizMode(container);

    await playFullGame(container);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    // The name was genuinely saved and used (sanity check the scenario isn't
    // vacuous), just never through any of these analytics/log surfaces.
    const { getNickname } = require('../../src/services/nicknameService');
    expect(getNickname()).toBe(NICKNAME);

    function assertNoNicknameLeak(callsArgs) {
      const serialized = JSON.stringify(callsArgs, (key, value) => (typeof value === 'function' ? '[fn]' : value)) || '';
      expect(serialized).not.toContain(NICKNAME);
    }

    assertNoNicknameLeak(fetchFn.mock.calls);
    assertNoNicknameLeak(storage.recordEvent.mock.calls);
    assertNoNicknameLeak(storage.recordEventOnce.mock.calls);
    assertNoNicknameLeak(storage.recordQuestionAnswered.mock.calls);
    assertNoNicknameLeak(storage.setItem.mock.calls);
    assertNoNicknameLeak(storage.getItem.mock.calls);
  });
});
