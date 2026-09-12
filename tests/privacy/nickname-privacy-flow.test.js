'use strict';

/**
 * Real cross-cutting scenario: capture -> save -> play -> reuse -> change ->
 * reuse -> delete -> guest, with the shared network/egress watcher
 * (tests/privacy/support/networkLeakWatch.js) installed BEFORE the first
 * nickname is ever typed and kept active for the whole flow.
 *
 * This is the "producto no filtra datos" half of the TRIOFSND-304 rework;
 * tests/privacy/networkLeakWatch.test.js is the other half (the detector's
 * own self-tests, including a deliberately-poisoned request) and is
 * DELIBERATELY a separate file/describe so a poisoned request can never
 * land in this suite's records or contradict its zero-leak expectation.
 *
 * Complements (does not replace) the already-passing, narrower assertions in
 * tests/pwa/nickname-flow.test.js (basic screen order, guest/saved skip,
 * Hall of Fame naming) -- this suite is the one that drives BOTH nicknames
 * through the entire lifecycle at once with the shared detector active, and
 * reuses the product's own storage-key contract instead of a second,
 * invented test key.
 */

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getByLabelText } = require('@testing-library/dom');

const { install, restore, settle, wrapFetch, findLeaks, stringContainsValue } = require('./support/networkLeakWatch');
const { collectProductionJsFiles } = require('../privacy-audit/collectSourceFiles');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { MIN_ADVANCE_DELAY_MS } = require('../../public/scripts/questionScreen');
const { NICKNAME_STORAGE_KEY } = require('../../src/services/nicknameService');
const {
  home: homeStrings,
  ageGate: ageGateStrings,
  nicknameRequest: nicknameStrings,
  nicknameSettings: nicknameSettingsStrings,
  question: questionStrings,
  privacy: privacyStrings,
} = require('../../public/i18n/es.json');

// Two unique, unusual tokens that could not plausibly collide with any real
// app string/id -- one initial, one replacement, per the acceptance
// criteria ("dos apodos únicos y reconocibles"). Both are <= 20 characters
// (NICKNAME_MAX_LENGTH), same as any value a real player could ever save.
const INITIAL_NICKNAME = 'ZeeglorpNickA1';
const REPLACEMENT_NICKNAME = 'QwomporNickB2';

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
  return Array.from({ length: count }, (unused, index) => buildQuestion(`q-${index}`));
}

function selectQuizMode(container) {
  getByRole(container, 'button', { name: ageGateStrings.eightPlusOption }).click();
  container.querySelector('[data-mode-id="quiz"]').click();
}

async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  buttons[correct ? 0 : 1].click();
  await jest.advanceTimersByTimeAsync(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

// Deliberately mixed hits/misses (5/10), same rationale as
// tests/pwa/nickname-flow.test.js: a perfect 10/10 on a single-level bank
// unlocks a level 2 that doesn't exist here, which safe-exits to Inicio
// instead of landing on Resultados.
async function playFullGame(container) {
  for (let i = 0; i < 10; i += 1) {
    await answerCurrentQuestion(container, { correct: i % 2 === 0 });
  }
  await jest.advanceTimersByTimeAsync(0);
}

function mockHomeFetch() {
  return jest.fn().mockResolvedValue({
    json: () =>
      Promise.resolve({
        home: homeStrings,
        ageGate: ageGateStrings,
        nicknameRequest: nicknameStrings,
        nicknameSettings: nicknameSettingsStrings,
      }),
  });
}

describe('privacidad + ciclo de vida completo del apodo (escenario real, detector compartido activo)', () => {
  let container;
  let addEventListenerSpy;
  let originalAudio;
  let fetchFn;

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
    window.sessionStorage.clear();
    document.cookie = '';
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    originalAudio = window.Audio;
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };

    // Vigilancia instalada ANTES de introducir o guardar el primer apodo, y
    // permanece activa durante todo el escenario real de abajo.
    install();
    fetchFn = wrapFetch(mockHomeFetch());
  });

  afterEach(() => {
    // restore() corre incluso si una aserción de arriba lanzó (afterEach
    // siempre se ejecuta), así que nunca deja fetch/XHR/sendBeacon parcheados.
    restore();
    jest.useRealTimers();
    container.remove();
    window.Audio = originalAudio;
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.cookie = '';
  });

  async function renderHomeFresh() {
    const { renderHome, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    jest.spyOn(require('../../src/data/questionBank'), 'loadQuestionBank').mockReturnValue(buildQuestionBank(10));

    const rendered = renderHome(document, renderers.renderHomeScreen, fetchFn);
    jest.advanceTimersByTime(0);
    return rendered;
  }

  /**
   * Fails loudly (with the offending records) instead of a bare boolean, so
   * an assertion failure names exactly what leaked and where. Uses the
   * `findLeaks` reference captured at module-load time (top of this file),
   * NOT a fresh `require('./support/networkLeakWatch')` -- `jest.resetModules()`
   * runs in `beforeEach` and would otherwise hand back a disconnected module
   * instance whose `records`/`pending` never saw anything `install()`
   * (bound to the original instance) actually captured, silently turning
   * every check here into a vacuous pass.
   */
  async function assertNeverLeaked(value) {
    await settle();
    const leaks = findLeaks(value);
    expect(leaks).toEqual([]);
  }

  test('ningún valor introducido como apodo sale jamás del dispositivo, en ningún punto de captura/guardado/reutilización/cambio/borrado/invitado', async () => {
    // 1. Mostrar la captura inicial: sin apodo guardado, "¡Jugar!" muestra la
    // pantalla de solicitud antes de la primera pregunta.
    await renderHomeFresh();
    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    expect(getByRole(container, 'heading', { name: nicknameStrings.screenTitle })).toBeInTheDocument();
    expect(container.querySelector('.age-gate-screen')).toBeNull();

    // D: dos acciones distinguibles por nombre accesible, campo con label
    // programática (no solo placeholder).
    const continueButton = getByRole(container, 'button', { name: nicknameStrings.continueButtonLabel });
    const guestButton = getByRole(container, 'button', { name: nicknameStrings.guestButtonLabel });
    expect(continueButton).not.toBe(guestButton);
    const input = getByLabelText(container, nicknameStrings.inputLabel);
    expect(input.tagName).toBe('INPUT');
    expect(input.hasAttribute('placeholder')).toBe(false);

    await assertNeverLeaked(INITIAL_NICKNAME);

    // 2. Guardar el primer apodo.
    input.value = `  ${INITIAL_NICKNAME}  `;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    continueButton.click();

    await Promise.resolve();
    expect(getByRole(container, 'heading', { name: ageGateStrings.screenTitle })).toBeInTheDocument();

    const { getNickname } = require('../../src/services/nicknameService');
    expect(getNickname()).toBe(INITIAL_NICKNAME);
    // Exactamente el valor recortado, bajo la clave oficial dinoquiz:.
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBe(JSON.stringify(INITIAL_NICKNAME));

    await assertNeverLeaked(INITIAL_NICKNAME);

    // 3. Comenzar una partida.
    selectQuizMode(container);
    await playFullGame(container);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    await assertNeverLeaked(INITIAL_NICKNAME);

    // Vuelta a Inicio.
    const exitButton = container.querySelector('.results-screen__exit-button');
    exitButton.click();
    // renderHome() resolves asynchronously (it awaits loadHomeResources), so
    // its promise chain must settle before asserting on the DOM (mirrors
    // tests/pwa/game-flow.test.js's own '"Salir" navigates back to Inicio').
    await jest.advanceTimersByTimeAsync(0);

    expect(container.querySelector('.home-screen')).not.toBeNull();

    // 4. Reutilizarlo en una partida posterior: la captura no vuelve a
    // aparecer.
    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    expect(container.querySelector('.nickname-screen')).toBeNull();
    expect(getByRole(container, 'heading', { name: ageGateStrings.screenTitle })).toBeInTheDocument();

    selectQuizMode(container);
    await playFullGame(container);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    await assertNeverLeaked(INITIAL_NICKNAME);

    container.querySelector('.results-screen__exit-button').click();
    // renderHome() resolves asynchronously (it awaits loadHomeResources), so
    // its promise chain must settle before asserting on the DOM (mirrors
    // tests/pwa/game-flow.test.js's own '"Salir" navigates back to Inicio').
    await jest.advanceTimersByTimeAsync(0);

    // 5. Cambiarlo por el segundo, desde el panel visible/accesible de
    // Inicio (control con nombre accesible inequívoco).
    const nicknameButton = getByRole(container, 'button', { name: homeStrings.globalControls.nicknameButton });
    nicknameButton.click();

    const panelInput = container.querySelector('.home-screen__nickname-input');
    const saveButton = container.querySelector('.home-screen__nickname-save-button');
    expect(panelInput.value).toBe(INITIAL_NICKNAME);

    panelInput.value = `  ${REPLACEMENT_NICKNAME}  `;
    panelInput.dispatchEvent(new Event('input', { bubbles: true }));
    saveButton.click();

    expect(getNickname()).toBe(REPLACEMENT_NICKNAME);
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBe(JSON.stringify(REPLACEMENT_NICKNAME));
    const currentEl = container.querySelector('.home-screen__nickname-current');
    expect(currentEl.textContent).toBe(
      nicknameSettingsStrings.currentNicknameFormat.replace('{nickname}', REPLACEMENT_NICKNAME)
    );

    // Desde el cambio de nombre en adelante, ni el apodo inicial ni el nuevo
    // pueden aparecer en ninguna comunicación observada.
    await assertNeverLeaked(INITIAL_NICKNAME);
    await assertNeverLeaked(REPLACEMENT_NICKNAME);

    const closeButton = container.querySelector('.home-screen__panel-close-button');
    if (closeButton) closeButton.click();

    // 6. Usar posteriormente el segundo apodo en una partida.
    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    expect(container.querySelector('.nickname-screen')).toBeNull();
    selectQuizMode(container);
    await playFullGame(container);
    expect(container.querySelector('.results-screen')).not.toBeNull();

    await assertNeverLeaked(INITIAL_NICKNAME);
    await assertNeverLeaked(REPLACEMENT_NICKNAME);

    container.querySelector('.results-screen__exit-button').click();
    // renderHome() resolves asynchronously (it awaits loadHomeResources), so
    // its promise chain must settle before asserting on the DOM (mirrors
    // tests/pwa/game-flow.test.js's own '"Salir" navigates back to Inicio').
    await jest.advanceTimersByTimeAsync(0);

    // 7. Borrarlo, con un control de borrado visible/accesible por teclado.
    getByRole(container, 'button', { name: homeStrings.globalControls.nicknameButton }).click();
    const deleteButton = container.querySelector('.home-screen__nickname-delete-button');
    deleteButton.click();
    const deleteConfirmButton = container.querySelector('.home-screen__nickname-delete-confirm-button');
    deleteConfirmButton.click();

    expect(getNickname()).toBeNull();
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBeNull();
    expect(container.querySelector('.home-screen__nickname-current').textContent).toBe(
      nicknameSettingsStrings.noNicknameSaved
    );

    // 8. Comenzar como invitado: la siguiente partida vuelve a ofrecer la
    // captura, y jugar como invitado no crea ninguna clave para el nombre.
    const closeButton2 = container.querySelector('.home-screen__panel-close-button');
    if (closeButton2) closeButton2.click();
    getByRole(container, 'button', { name: homeStrings.playButton }).click();
    expect(getByRole(container, 'heading', { name: nicknameStrings.screenTitle })).toBeInTheDocument();
    getByRole(container, 'button', { name: nicknameStrings.guestButtonLabel }).click();

    expect(getByRole(container, 'heading', { name: ageGateStrings.screenTitle })).toBeInTheDocument();
    expect(getNickname()).toBeNull();
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBeNull();

    // Tras el borrado, las comunicaciones posteriores siguen sin contener
    // ninguno de los dos valores.
    await assertNeverLeaked(INITIAL_NICKNAME);
    await assertNeverLeaked(REPLACEMENT_NICKNAME);

    // El apodo no se copia a cookies ni a sessionStorage en ningún momento
    // del escenario completo.
    expect(document.cookie).not.toContain(INITIAL_NICKNAME);
    expect(document.cookie).not.toContain(REPLACEMENT_NICKNAME);
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      const value = window.sessionStorage.getItem(key);
      expect(stringContainsValue(value, INITIAL_NICKNAME)).toBe(false);
      expect(stringContainsValue(value, REPLACEMENT_NICKNAME)).toBe(false);
    }
    // IndexedDB: no polyfilled by jsdom in this project's test environment
    // (confirmed: `typeof window.indexedDB === 'undefined'`), so there is no
    // real transport here to instrument -- documented rather than silently
    // skipped, per the "no se exige interceptar APIs que no existan" clause.
    expect(typeof window.indexedDB).toBe('undefined');
  });

  test('un valor vacío o solo espacios no crea una clave local de apodo, ni al continuar ni al jugar como invitado', async () => {
    await renderHomeFresh();
    getByRole(container, 'button', { name: homeStrings.playButton }).click();

    const input = getByLabelText(container, nicknameStrings.inputLabel);
    input.value = '     ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    getByRole(container, 'button', { name: nicknameStrings.continueButtonLabel }).click();

    // Un valor vacío tras recortar se trata como error de validación (no
    // continúa) -- se corrige y se continúa como invitado para probar que
    // ninguna clave con valor vacío llega nunca a localStorage.
    expect(container.querySelector('.nickname-screen')).not.toBeNull();
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBeNull();

    getByRole(container, 'button', { name: nicknameStrings.guestButtonLabel }).click();
    expect(window.localStorage.getItem(NICKNAME_STORAGE_KEY)).toBeNull();
  });

  test('transportes/colas cubiertos por la vigilancia: todo uso de fetch/XMLHttpRequest/sendBeacon en el código de producto está instrumentado', () => {
    const files = collectProductionJsFiles();
    const usedTransports = new Set();
    for (const file of files) {
      if (/\bfetch\s*\(/.test(file.content)) usedTransports.add('fetch');
      if (/new\s+XMLHttpRequest\s*\(/.test(file.content)) usedTransports.add('XMLHttpRequest');
      if (/\.sendBeacon\s*\(/.test(file.content)) usedTransports.add('sendBeacon');
      if (/new\s+WebSocket\s*\(/.test(file.content)) usedTransports.add('WebSocket');
      if (/new\s+EventSource\s*\(/.test(file.content)) usedTransports.add('EventSource');
    }

    // tests/privacy/support/networkLeakWatch.js instruments exactly these
    // three transports (guarded by presence, per its own doc comment). If a
    // new transport (WebSocket/EventSource/a custom analytics client) ever
    // gets used by shipped code, this fails instead of silently missing it.
    const instrumented = new Set(['fetch', 'XMLHttpRequest', 'sendBeacon']);
    const uninstrumented = [...usedTransports].filter((transport) => !instrumented.has(transport));
    expect(uninstrumented).toEqual([]);
    // Sanity: the app does use at least one instrumented transport (fetch,
    // for i18n/data resources), so this isn't vacuously true.
    expect(usedTransports.has('fetch')).toBe(true);
  });

  test('actualizaciones de texto: la política de privacidad y el age gate siguen describiendo correctamente el apodo opcional local', () => {
    const flatPrivacyText = privacyStrings.sections.map((section) => `${section.heading} ${section.body}`).join(' ');

    // El apodo es opcional, se guarda solo en el dispositivo, puede
    // cambiarse/borrarse, y se elimina con el borrado general de datos.
    expect(flatPrivacyText).toMatch(/apodo/i);
    expect(flatPrivacyText).toMatch(/solo en este dispositivo|solo|únicamente/i);
    expect(flatPrivacyText).toMatch(/editarlo o borrarlo/i);
    expect(flatPrivacyText).toMatch(/borrar todos los datos del dispositivo/i);

    // La política reconoce explícitamente la excepción del apodo en vez de
    // afirmar que no se guarda ningún dato.
    expect(flatPrivacyText).toMatch(/el apodo guardado es la única excepción/i);

    // El age gate no contiene la frase prohibida y distingue la edad
    // (efímera, de la partida) del apodo (persistente, local).
    expect(ageGateStrings.instructions).not.toContain('Solo se usa en esta partida: no la guardamos ni la compartimos');
    expect(ageGateStrings.instructions.toLowerCase()).toContain('apodo');
    expect(ageGateStrings.instructions).toMatch(/no se guarda ni se comparte/i);
  });
});
