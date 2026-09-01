'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-321: privacy regression -- sin telemetría remota ni
 * identificadores (PRD "ningún dato generado por el jugador puede salir del
 * dispositivo", "analítica remota ... fuera del dispositivo" out of scope).
 *
 * Complements the static audit (tests/privacy-audit/*.test.js, no source
 * file references a tracking domain/endpoint) and the Playwright audit
 * (tests/e2e/privacy-network-audit.spec.js, a real browser never issues a
 * cross-origin request during one game). This suite is the dynamic jsdom
 * regression: it drives a whole session -- opening the mode selector,
 * playing a partida in the quiz mode through real DOM interactions (mirrors
 * tests/pwa/offline-full-game.test.js) plus a partida in every other mode
 * through the same shared level architecture every mode's own game module
 * calls into (gameFlow.js's startLevel/resolveLevelOutcome, PRD
 * "shared_game_structure"), opening Resultados, opening the diagnostics
 * screen, exporting its summary and deleting it -- while every network
 * primitive the browser exposes (fetch, XMLHttpRequest, sendBeacon) is
 * intercepted, and asserts none of them is ever called. It also asserts
 * every key public/scripts/diagnostics.js itself writes to localStorage
 * during that whole session carries the `dinoquiz:` prefix and that neither
 * its counters nor its recorded errors ever carry a creature name or a
 * free-text/individual answer -- only opaque aggregate names/counts and
 * mode/category/code (see that module's own doc comment).
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const i18n = require('../../public/i18n/es.json');
const { results: resultsStrings, question: questionStrings, dinosaurNames } = i18n;
const { MIN_ADVANCE_DELAY_MS } = require('../../src/screens/QuestionScreen');
const { loadQuestionBank } = require('../../src/data/questionBank');
const gameFlow = require('../../src/game/gameFlow');
const { MODE_IDS, MODES_CATALOG } = require('../../src/game/modesCatalog');
const { renderModeSelectorScreen } = require('../../src/screens/ModeSelectorScreen');
const { renderDiagnosticsScreen } = require('../../src/screens/DiagnosticsScreen');
const diagnostics = require('../../src/services/diagnostics');

const AVAILABLE_FIXTURE = MODES_CATALOG.map((mode) => ({
  modeId: mode.id,
  available: true,
  cause: null,
  details: null,
}));

// Every mode besides quiz -- quiz is played end-to-end through real DOM
// clicks below; the rest are driven directly through the same shared level
// entry point their own game modules call into (see gameFlow.js's own doc
// comment: "una partida corresponde a un nivel").
const OTHER_MODE_IDS = Object.keys(MODE_IDS)
  .map((key) => MODE_IDS[key])
  .filter((modeId) => modeId !== MODE_IDS.QUIZ);

// Anything that would identify an individual child or leak a specific
// in-game answer: every playable creature's display name -- the export
// summary and every stored diagnostics key must never contain one.
const NAME_DENYLIST = Object.values(dinosaurNames || {});

// The only counter-name vocabulary incrementCounter() is ever called with
// across the whole app (gameFlow.js/main.js/modeSelectorScreen.js/
// classifyGame.js's own doc comments) -- an opaque aggregate name segment
// optionally followed by a modeId and/or a level number, never free text a
// player typed or chose.
const KNOWN_COUNTER_PREFIXES = [
  'selectorOpen',
  'gameStarted',
  'gamesByModeLevel',
  'gameCompleted',
  'gameAbandoned',
  'correctAnswers',
  'starsEarned',
  'unlocks',
];
const KNOWN_MODE_IDS = new Set(Object.keys(MODE_IDS).map((key) => MODE_IDS[key]));

function prepareQuestions(rawQuestions) {
  return require(MAIN_JS_PATH).prepareBrowserQuestions(rawQuestions, i18n);
}

/** Answers the question currently on screen with its correct option, then advances (mirrors tests/pwa/offline-full-game.test.js). */
function answerCurrentQuestionCorrectly(container, session) {
  const question = session.questions[session.state.questionIndex];
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  buttons[question.correctAnswerIndex].click();
  jest.advanceTimersByTime(MIN_ADVANCE_DELAY_MS);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

/** A fixed 10-question pool, valid for gameFlow.startLevel regardless of modeId -- only its length/shape matters to that shared entry point, never its content. */
function makeDummyQuestionPool() {
  return Array.from({ length: 10 }, (unused, index) => ({ id: 'dummy-' + index }));
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Intercepts every network primitive the browser exposes and records every attempted call instead of letting it reach a real network stack. */
function installNetworkInterceptors() {
  const calls = [];

  const originalFetch = global.fetch;
  global.fetch = jest.fn((input) => {
    calls.push({ type: 'fetch', target: String(input) });
    return Promise.reject(new Error('network access blocked in privacy regression test'));
  });

  const originalOpen = window.XMLHttpRequest.prototype.open;
  const originalSend = window.XMLHttpRequest.prototype.send;
  window.XMLHttpRequest.prototype.open = function (method, url) {
    calls.push({ type: 'xhr-open', target: String(url) });
    return originalOpen.apply(this, arguments);
  };
  window.XMLHttpRequest.prototype.send = function () {
    calls.push({ type: 'xhr-send' });
    return originalSend.apply(this, arguments);
  };

  const originalSendBeacon = window.navigator.sendBeacon;
  window.navigator.sendBeacon = function (url) {
    calls.push({ type: 'sendBeacon', target: String(url) });
    return true;
  };

  return {
    calls,
    restore() {
      global.fetch = originalFetch;
      window.XMLHttpRequest.prototype.open = originalOpen;
      window.XMLHttpRequest.prototype.send = originalSend;
      window.navigator.sendBeacon = originalSendBeacon;
    },
  };
}

describe('TRIOFSND-321: privacy regression -- sin telemetría remota ni identificadores', () => {
  let container;
  let network;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    window.localStorage.clear();
    diagnostics.resetDiagnostics();
    network = installNetworkInterceptors();
  });

  afterEach(() => {
    jest.useRealTimers();
    network.restore();
    container.remove();
    diagnostics.resetDiagnostics();
    window.localStorage.clear();
  });

  test('a full session -- selector, partidas en quiz y en cada otro modo, resultados, diagnóstico, exportación y borrado -- no hace ninguna petición de red y sólo escribe claves dinoquiz: no identificables', async () => {
    // 1. Selector: opening it tallies the local `selectorOpen` counter and
    // selecting a card is a real click on a real button (TRIOFSND-231).
    const selectorView = renderModeSelectorScreen(container, {
      availability: AVAILABLE_FIXTURE,
      onSelectMode: () => {},
    });
    selectorView.cards[MODE_IDS.QUIZ].click();

    // 2. Partida en quiz, jugada completa con clics reales sobre el DOM
    // (Inicio -> 10 preguntas -> Resultados), igual que
    // tests/pwa/offline-full-game.test.js.
    const { resolveScreenRenderers, startNewGame } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = prepareQuestions(loadQuestionBank());

    jest.useFakeTimers();
    let session;
    try {
      session = startNewGame(container, renderers, questions, document, undefined, Math.random);
      for (let i = 0; i < gameFlow.QUESTIONS_PER_GAME; i += 1) {
        expect(container.querySelector('.question-screen')).not.toBeNull();
        answerCurrentQuestionCorrectly(container, session);
      }
    } finally {
      jest.useRealTimers();
    }

    // 3. Apertura de resultados: la partida de quiz aterriza aquí de verdad.
    expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();

    // 4. Partidas en cada uno de los otros siete modos, a través del mismo
    // punto de entrada compartido que usa el propio código de cada modo
    // (gameFlow.js's startLevel/resolveLevelOutcome).
    const dummyPool = makeDummyQuestionPool();
    OTHER_MODE_IDS.forEach((modeId) => {
      const started = gameFlow.startLevel(1, {
        modeId,
        getQuestionsByLevel: () => dummyPool,
        randomFn: () => 0,
      });
      expect(started.error).toBeUndefined();

      const answers = [true, true, true, true, true, true, true, true, false, false].map((isCorrect) => ({ isCorrect }));
      const outcome = gameFlow.resolveLevelOutcome({ level: 1, answers, modeId });
      expect(typeof outcome.gameOver).toBe('boolean');
    });

    // A round-generation failure also happens on a real device (an
    // empty/corrupted resource) -- proves recordError's own write stays
    // code-only under a real failure path too, not just a direct call.
    const failedStart = gameFlow.startLevel(1, { modeId: MODE_IDS.LABERINTO, getQuestionsByLevel: () => [] });
    expect(failedStart.error).toBe('level_generation_failed');

    expect(Object.keys(diagnostics.getCounters()).length).toBeGreaterThan(0);
    expect(diagnostics.getErrors().length).toBeGreaterThan(0);

    // Every recorded error carries exactly date/mode/category/code -- never
    // an extra field that could smuggle a name or an answer.
    diagnostics.getErrors().forEach((entry) => {
      expect(Object.keys(entry).sort()).toEqual(['category', 'code', 'date', 'mode']);
    });

    // Every counter key is an opaque aggregate name (optionally scoped by a
    // known modeId/level) -- never free text a player typed or an
    // individual round's answer/selection.
    const counters = diagnostics.getCounters();
    Object.keys(counters).forEach((key) => {
      expect(Number.isFinite(counters[key])).toBe(true);
      const parts = key.split(':');
      expect(KNOWN_COUNTER_PREFIXES).toContain(parts[0]);
      parts.slice(1).forEach((part) => {
        expect(KNOWN_MODE_IDS.has(part) || /^\d+$/.test(part)).toBe(true);
      });
    });

    // 5. Apertura de diagnóstico: lee los contadores/errores reales
    // acumulados arriba (no se pasan `options.counters`/`options.errors`).
    let exportedText = null;
    const copyToClipboard = jest.fn((text) => {
      exportedText = text;
      return Promise.resolve();
    });
    const downloadFile = jest.fn();

    const diagnosticsView = renderDiagnosticsScreen(container, {
      modes: MODES_CATALOG,
      resourceAvailability: AVAILABLE_FIXTURE,
      serviceWorkerStatus: 'unsupported',
      swVersion: null,
      lastPreloadAt: null,
      copyToClipboard,
      downloadFile,
    });

    expect(getByRole(container, 'heading', { name: i18n.diagnostics.screenTitle, level: 1 })).toBeInTheDocument();

    // 6. Exportación: capturada localmente, nunca enviada a ningún sitio.
    diagnosticsView.exportButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(copyToClipboard).toHaveBeenCalledTimes(1);
    expect(downloadFile).not.toHaveBeenCalled();
    expect(typeof exportedText).toBe('string');
    NAME_DENYLIST.forEach((name) => {
      expect(exportedText).not.toContain(name);
    });

    // 7. Borrado: pide confirmación y sólo entonces limpia diagnostics.js.
    diagnosticsView.resetButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    diagnosticsView.resetConfirmButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    expect(diagnostics.getCounters()).toEqual({});
    expect(diagnostics.getErrors()).toEqual([]);

    // Toda clave que diagnostics.js posee/escribe lleva el prefijo dinoquiz:.
    diagnostics.DIAGNOSTICS_KEYS.forEach((key) => {
      expect(key).toMatch(/^dinoquiz:/);
    });

    // Ninguna llamada a fetch/XMLHttpRequest/navigator.sendBeacon se produjo
    // en ningún momento de toda la sesión -- DinoQuiz no tiene backend
    // (CONVENTIONS.md); el único camino capaz de hacer red
    // (LogService#sendLogs) nunca se invoca desde ninguna pantalla/servicio
    // ejercitado arriba.
    expect(network.calls).toEqual([]);
  });
});
