'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-288: covers the Ordena por tamaño integration end to end --
 * reaching the mode by actually tapping its card on the illustrated mode
 * selector (public/scripts/modeSelectorScreen.js, via main.js's
 * `renderModeSelector`/`handleModeSelected`), playing a full
 * ROUNDS_PER_GAME-round game (driven by roundContract.js, mirroring Oído
 * Jurásico's own offline coverage) with the device reporting no network
 * connectivity at all, and the `dinoquiz:lastMode` state main.js drives for
 * every mode.
 *
 * The card is reachable and tappable here because
 * `src/data/creatureSheet.js`'s roster already verifies >=4 creatures'
 * `lengthMeters`, and main.js's `evaluateModesWithShadowOverride` overrides
 * the Ordena por tamaño card's verdict with the real
 * `isSizeOrderModeUnlocked` check (mirroring the Sombra/Clasifica overrides
 * already in place) instead of leaving it pinned to modesCatalog.js's
 * still-generic placeholder.
 *
 * Every round is confirmed without swapping anything, which -- since
 * `initialOrder` is always exactly one swap away from `correctOrder`
 * (src/game/sizeOrderRoundGenerator.js's own guarantee) -- is deterministically
 * "incorrecto", so the game always ends 0/10. That's enough to exercise the
 * full flow without needing to read the generated round's own correct order
 * out of a private closure.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const i18n = require('../../public/i18n/es.json');
const { results: resultsStrings, modeSelector: modeSelectorStrings, modes: modesStrings } = i18n;

const ROUNDS_PER_GAME = 10;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

function buildResources() {
  return { modeSelector: modeSelectorStrings, modes: modesStrings };
}

/** Taps a mode selector card by its accessible label, the same real interaction a player performs. */
function clickModeCard(container, modeId) {
  getByRole(container, 'button', { name: modeSelectorStrings.modes[modeId].accessibleLabel }).click();
}

/** Flushes the real (non-fake) timer/microtask queue so handleModeSelected's async incomplete-game check settles before assertions run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Confirms every round without swapping (always "incorrecto") and taps "Siguiente", ending on Resultados. */
function playFullGame(container) {
  for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
    const confirmButton = container.querySelector('.size-order-screen__confirm-button');
    confirmButton.click();
    const nextButton = container.querySelector('.size-order-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
  }
}

describe('TRIOFSND-288: Ordena por tamaño reachable via the mode selector, plays a full offline game', () => {
  let container;
  let hadOwnFetch;
  let originalFetch;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    delete window.DinoQuiz;
    hadOwnFetch = Object.prototype.hasOwnProperty.call(global, 'fetch');
    originalFetch = global.fetch;
    window.localStorage.clear();
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

  test('tapping the Ordena por tamaño card on the real mode selector starts a full offline game, ending on Resultados with a normalized score', async () => {
    global.fetch = rejectingFetch();

    const { renderModeSelector, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();

    renderModeSelector(container, renderers, questions, document, undefined, buildResources(), {
      randomFn: () => 0.5,
    });

    expect(
      getByRole(container, 'button', { name: modeSelectorStrings.modes.ordenaPorTamano.accessibleLabel })
    ).not.toHaveAttribute('aria-disabled');

    clickModeCard(container, 'ordenaPorTamano');
    await flush();

    expect(container.querySelector('.size-order-screen')).not.toBeNull();

    playFullGame(container);

    expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
    expect(container.textContent).toContain('0/10');

    // Last-mode restoration (TRIOFSND-230/288): remembered under dinoquiz:lastMode.
    expect(window.localStorage.getItem('dinoquiz:lastMode')).toBe('"ordenaPorTamano"');

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('"Volver a jugar" starts a fresh Ordena por tamaño game after Resultados', () => {
    global.fetch = rejectingFetch();

    const { startSizeOrderGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    startSizeOrderGame(container, renderers, document, undefined, { randomFn: () => 0.5 });
    playFullGame(container);

    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();

    expect(container.querySelector('.size-order-screen')).not.toBeNull();
    expect(container.querySelector('.results-screen')).toBeNull();
  });

  test('starting a game attaches roundDiagnosticsService to the session (TRIOFSND-246 local diagnostics)', () => {
    jest.doMock('../../src/services/roundDiagnosticsService', () => ({
      attachToSession: jest.fn(() => ({ off: jest.fn() })),
    }));

    const { startSizeOrderGame, resolveScreenRenderers, SIZE_ORDER_MODE_ID } = require(MAIN_JS_PATH);
    const roundDiagnosticsService = require('../../src/services/roundDiagnosticsService');
    const renderers = resolveScreenRenderers();

    startSizeOrderGame(container, renderers, document, undefined, { randomFn: () => 0.5 });

    expect(roundDiagnosticsService.attachToSession).toHaveBeenCalledTimes(1);
    const [session, options] = roundDiagnosticsService.attachToSession.mock.calls[0];
    expect(session.status).toBe('playing');
    expect(options).toEqual({ modeId: SIZE_ORDER_MODE_ID, level: null });

    jest.dontMock('../../src/services/roundDiagnosticsService');
  });

  test('a round-generation failure surfaces on the round and roundDiagnosticsService logs its local code', () => {
    const failures = [];
    jest.doMock('../../src/services/roundDiagnosticsService', () =>
      jest.requireActual('../../src/services/roundDiagnosticsService')
    );
    jest.doMock('../../src/services/logging', () => ({
      LogService: jest.fn().mockImplementation(() => ({
        logRoundGameStarted: jest.fn(),
        logRoundGameCompleted: jest.fn(),
        logRoundGameAbandoned: jest.fn(),
        logRoundGenerationFailure: (modeId, code) => failures.push({ modeId, code }),
      })),
    }));

    const { startSizeOrderGame, resolveScreenRenderers, resolveSizeOrderGame, SIZE_ORDER_MODE_ID } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const sizeOrderGame = resolveSizeOrderGame();

    // Two creatures within 1% of each other never clear the default 15%
    // minRelativeDifference -- every 3/4-creature combination fails,
    // mirroring generateSizeOrderRound's own documented failure mode.
    const tooCloseCreatures = [
      { id: 'a', lengthMeters: 1 },
      { id: 'b', lengthMeters: 1.01 },
      { id: 'c', lengthMeters: 1.02 },
    ];

    startSizeOrderGame(container, renderers, document, undefined, {
      randomFn: () => 0,
      creatures: tooCloseCreatures,
      creatureCount: 3,
    });

    expect(failures).toEqual([{ modeId: SIZE_ORDER_MODE_ID, code: sizeOrderGame.ERRORS.NO_VALID_COMBINATION }]);
    // The screen degrades to its own accessible "error-de-datos" state
    // instead of a broken board -- it never blocks the app shell.
    expect(container.querySelector('.size-order-screen')).not.toBeNull();

    jest.dontMock('../../src/services/roundDiagnosticsService');
    jest.dontMock('../../src/services/logging');
  });
});
