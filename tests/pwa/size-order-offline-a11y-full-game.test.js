'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-289: cross-cutting coverage for Ordena por tamaño, complementary
 * to size-order-game-browser.test.js (unit) and offline-size-order-game.test.js
 * (reachability/replay/diagnostics):
 *  - the mode's own runtime resources ship in the service worker's
 *    PRECACHE_URLS, and SW_VERSION was bumped when they were added
 *    (public/service-worker.js's own "Bump SW_VERSION whenever precached
 *    files change" rule).
 *  - a full ROUNDS_PER_GAME-round game completes with the network fully
 *    disabled.
 *  - every in-game interaction -- selecting/swapping creatures, confirming
 *    a round and moving to the next one -- is operable entirely from the
 *    keyboard (sizeOrderScreen.js's own documented Enter/Space `keydown`
 *    parity), never a synthetic `.click()` call from the test itself.
 *  - the tenth round's Resultados shows the shared percentage/stars
 *    (scoring.js's mode-agnostic `normalizeOutcome`, TRIOFSND-251/252) and
 *    persists this mode's own progress independently of every other mode's
 *    (modeProgressStorage.js, TRIOFSND-250/253).
 */

const SW_PATH = path.resolve(__dirname, '../../public/service-worker.js');
const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const SIZE_ORDER_GAME_PATH = path.resolve(__dirname, '../../public/scripts/sizeOrderGame.js');
const i18n = require('../../public/i18n/es.json');
const { results: resultsStrings } = i18n;

const ROUNDS_PER_GAME = 10;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

/** Activates an element purely via keyboard (Enter keydown), never `.click()` -- exercises sizeOrderScreen.js's own documented keydown-to-click translation instead of bypassing it. */
function keyboardActivate(element) {
  element.focus();
  expect(document.activeElement).toBe(element);
  const event = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

function creatureButtonFor(container, creatureId) {
  const image = Array.from(container.querySelectorAll('.size-order-screen__creature-image')).find((el) =>
    el.src.includes('dinosaurs/' + creatureId + '.svg')
  );
  expect(image).toBeTruthy();
  return image.closest('button');
}

/**
 * Every round this constant `randomFn` produces is identical (same
 * creatures, same `correctOrder`/`initialOrder`), so the one mismatched pair
 * computed here holds for all ROUNDS_PER_GAME rounds -- swapping it via the
 * keyboard on every round always reaches the correct order.
 */
function precomputeSwapPair(randomFn) {
  const sizeOrderGame = require(SIZE_ORDER_GAME_PATH);
  const context = sizeOrderGame.buildSizeOrderRoundContext({ randomFn });
  const round = sizeOrderGame.generateSizeOrderRoundForContract(0, context);

  const mismatchedIndices = round.correctOrder
    .map((id, index) => index)
    .filter((index) => round.correctOrder[index] !== round.initialOrder[index]);
  expect(mismatchedIndices).toHaveLength(2);

  return [round.initialOrder[mismatchedIndices[0]], round.initialOrder[mismatchedIndices[1]]];
}

/** Plays every round to a correct answer using only keydown Enter activations: select the first mismatched creature, swap it with the second, confirm, then move to the next round. */
function playFullGameByKeyboard(container, [firstId, secondId]) {
  for (let round = 0; round < ROUNDS_PER_GAME; round += 1) {
    keyboardActivate(creatureButtonFor(container, firstId));
    keyboardActivate(creatureButtonFor(container, secondId));

    const confirmButton = container.querySelector('.size-order-screen__confirm-button');
    keyboardActivate(confirmButton);

    const nextButton = container.querySelector('.size-order-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    keyboardActivate(nextButton);
  }
}

describe('TRIOFSND-289: recursos de Ordena por tamaño en PRECACHE_URLS y SW_VERSION incrementado', () => {
  test('el código del modo (sizeOrderGame.js/sizeOrderScreen.js) está en PRECACHE_URLS', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    expect(PRECACHE_URLS).toContain('/scripts/sizeOrderGame.js');
    expect(PRECACHE_URLS).toContain('/scripts/sizeOrderScreen.js');
  });

  test('cada imagen de criatura que el tablero puede mostrar está precacheada', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    // eslint-disable-next-line global-require
    const { DINOSAUR_LENGTHS } = require(SIZE_ORDER_GAME_PATH);

    Object.keys(DINOSAUR_LENGTHS).forEach((creatureId) => {
      expect(PRECACHE_URLS).toContain(`/assets/images/dinosaurs/${creatureId}.svg`);
    });
  });

  test('el copy de Ordena por tamaño se sirve desde el i18n ya precacheado (nunca texto embebido en JS)', () => {
    // eslint-disable-next-line global-require
    const { PRECACHE_URLS } = require(SW_PATH);
    expect(PRECACHE_URLS).toContain('/i18n/es.json');
    expect(i18n.sizeOrder).toBeDefined();
  });

  test('SW_VERSION se incrementó al integrar el precache de Ordena por tamaño (era v29 antes de TRIOFSND-288)', () => {
    // eslint-disable-next-line global-require
    const { SW_VERSION } = require(SW_PATH);
    const PRE_SIZE_ORDER_SW_VERSION = 'v29';

    expect(SW_VERSION).not.toBe(PRE_SIZE_ORDER_SW_VERSION);
    const currentVersionNumber = Number(SW_VERSION.replace('v', ''));
    const previousVersionNumber = Number(PRE_SIZE_ORDER_SW_VERSION.replace('v', ''));
    expect(currentVersionNumber).toBeGreaterThan(previousVersionNumber);
  });
});

describe('TRIOFSND-289: partida completa de 10 rondas offline, íntegramente por teclado', () => {
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

  test('las 10 rondas se seleccionan, intercambian, confirman y avanzan solo con teclado, con la red desactivada', () => {
    global.fetch = rejectingFetch();

    const randomFn = () => 0.5;
    const swapPair = precomputeSwapPair(randomFn);

    const { startSizeOrderGame, resolveScreenRenderers, resolveModeProgressStorage } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const modeProgressStorage = resolveModeProgressStorage();

    startSizeOrderGame(container, renderers, document, undefined, { randomFn, modeProgressStorage });

    expect(container.querySelector('.size-order-screen')).not.toBeNull();

    playFullGameByKeyboard(container, swapPair);

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('tras la décima ronda, Resultados muestra puntuación, porcentaje y estrellas, y el progreso persiste de forma independiente por modo', async () => {
    const randomFn = () => 0.5;
    const swapPair = precomputeSwapPair(randomFn);

    const { startSizeOrderGame, resolveScreenRenderers, resolveModeProgressStorage, SIZE_ORDER_MODE_ID } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const modeProgressStorage = resolveModeProgressStorage();

    startSizeOrderGame(container, renderers, document, undefined, { randomFn, modeProgressStorage });
    playFullGameByKeyboard(container, swapPair);

    // finishSizeOrderGame persists via modeProgressStorage.recordResult
    // fire-and-forget (never awaited by main.js itself, mirrors finishLevel)
    // -- flush the task queue (several awaited adapter-resolution hops deep)
    // so its write settles before reading it back.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Every round was swapped into the correct order -> a perfect 10/10 game.
    expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
    expect(container.textContent).toContain('10/10');
    expect(container.querySelector('.results-screen__percentage')).toHaveTextContent('100');
    expect(container.querySelector('.results-screen__stars')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('3')
    );

    const sizeOrderResult = await modeProgressStorage.getLastResult(SIZE_ORDER_MODE_ID);
    expect(sizeOrderResult).toEqual({ score: 10, maxScore: 10, percentage: 100, stars: 3, level: null });

    // PRD "Progresión independiente por modo": a mode never seen this game
    // stays untouched by Ordena por tamaño's own recorded result.
    expect(await modeProgressStorage.getLastResult('quiz')).toBeNull();
  });
});
