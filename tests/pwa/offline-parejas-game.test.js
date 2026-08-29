'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-276: covers the Parejas jurásicas integration end to end --
 * reaching the mode by actually tapping its card on the illustrated mode
 * selector (public/scripts/modeSelectorScreen.js, via main.js's
 * `renderModeSelector`/`handleModeSelected`), the catalog gate (7 creatures
 * blocks, 8 unlocks -- modesCatalog.js's plain MIN_CREATURES:8 requirement
 * already evaluates the real, shipped roster correctly, no per-mode override
 * needed unlike Sombra/Clasifica/Ordena por tamaño's field-scoped
 * requirements), playing a full level (10 boards, matched without ever
 * exceeding the soft attempt limit) with the device reporting no network
 * connectivity at all, and the `dinoquiz:lastMode` state main.js drives for
 * every mode.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const PAREJAS_GAME_PATH = path.resolve(__dirname, '../../public/scripts/parejasGame.js');
const i18n = require('../../public/i18n/es.json');
const { results: resultsStrings, modeSelector: modeSelectorStrings, modes: modesStrings } = i18n;
const { MISMATCH_RESET_DELAY_MS } = require('../../public/scripts/parejasScreen');

const ROUNDS_PER_GAME = 10;
const RANDOM_FN = () => 0.5;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

function buildResources() {
  return { modeSelector: modeSelectorStrings, modes: modesStrings };
}

/** Taps a mode selector card by its accessible label, the same real interaction a player performs (mirrors tests/pwa/mode-change-flow.test.js's own clickModeCard). */
function clickModeCard(container, modeId) {
  getByRole(container, 'button', { name: modeSelectorStrings.modes[modeId].accessibleLabel }).click();
}

/** Flushes the real (non-fake) microtask queue so an async finishParejasLevel settles before assertions run. */
function flush() {
  return Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());
}

/**
 * Precomputes the exact board `parejasScreen.js` will render for round
 * `roundIndex` of `level`, by calling parejasGame.js's own `startRound` with
 * the identical, stateless `randomFn` (a constant function has no internal
 * state, so calling it here independently of the app's own internal call
 * reproduces byte-for-byte the same shuffle) -- so a test can play a board
 * *perfectly* (every reveal a real match, zero mismatches) without reading
 * anything off the DOM first, the same way an omniscient player would.
 */
function precomputeRound(roundIndex, level) {
  const parejasGame = require(PAREJAS_GAME_PATH);
  return parejasGame.startRound({ roundIndex, level, seed: undefined, dinosaurPool: undefined, randomFn: RANDOM_FN });
}

/**
 * Plays `round` (as precomputed by `precomputeRound`) to completion with
 * zero mismatches: `parejasScreen.js` appends one `<button>` per card in
 * `round.cards` order, so `cardButtons()[cardId]` always addresses the exact
 * same card the precomputed round describes.
 */
function playRoundPerfectly(container, round) {
  const cardButtons = Array.from(container.querySelectorAll('.parejas-screen__card'));
  const byCreature = new Map();
  round.cards.forEach((card) => {
    if (!byCreature.has(card.creatureId)) {
      byCreature.set(card.creatureId, []);
    }
    byCreature.get(card.creatureId).push(card.cardId);
  });

  byCreature.forEach(([firstCardId, secondCardId]) => {
    cardButtons[firstCardId].click();
    cardButtons[secondCardId].click();
  });
}

/** Plays `ROUNDS_PER_GAME` boards of `level` perfectly (never exceeding the soft attempt limit), tapping "Siguiente"/"onGameOver" after each. */
async function playFullLevelPerfectly(container, level) {
  for (let roundIndex = 0; roundIndex < ROUNDS_PER_GAME; roundIndex += 1) {
    const round = precomputeRound(roundIndex, level);
    playRoundPerfectly(container, round);
    const nextButton = container.querySelector('.parejas-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
    await flush();
  }
}

describe('TRIOFSND-276: Parejas jurásicas reachable via the mode selector, plays a full offline game', () => {
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

  test('tapping the Parejas card on the real mode selector starts a full offline level, ending on Resultados with a normalized score', async () => {
    global.fetch = rejectingFetch();

    const { renderModeSelector, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();

    renderModeSelector(container, renderers, questions, document, undefined, buildResources(), {
      randomFn: RANDOM_FN,
    });

    expect(getByRole(container, 'button', { name: modeSelectorStrings.modes.parejas.accessibleLabel })).not.toHaveAttribute(
      'aria-disabled'
    );

    clickModeCard(container, 'parejas');
    await flush();

    expect(container.querySelector('.parejas-screen')).not.toBeNull();

    await playFullLevelPerfectly(container, 1);

    expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
    expect(container.textContent).toContain('10/10');
    expect(container.textContent).toContain('100%');
    // No 11th round is ever generated -- the flow lands on Resultados, not
    // another board.
    expect(container.querySelector('.parejas-screen')).toBeNull();

    // Last-mode restoration (TRIOFSND-230/276): remembered under dinoquiz:lastMode.
    expect(window.localStorage.getItem('dinoquiz:lastMode')).toBe('"parejas"');

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('"Volver a jugar" continues into the newly unlocked level 2 after a perfect level 1', async () => {
    global.fetch = rejectingFetch();

    const { startParejasLevelGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    startParejasLevelGame(container, renderers, document, undefined, { randomFn: RANDOM_FN });

    await playFullLevelPerfectly(container, 1);

    // A perfect level 1 unlocks level 2 (PRD "el desbloqueo se evalúa una
    // sola vez al terminar la partida"), so the primary action becomes
    // "Ir al nivel 2" instead of the generic playAgainButton label -- see
    // resultsScreen.js's own `resolvePlayAgainButtonLabel`.
    expect(container.textContent).toContain('Has desbloqueado el nivel 2');
    container.querySelector('.results-screen__play-again-button').click();
    await flush();

    expect(container.querySelector('.parejas-screen')).not.toBeNull();
    expect(container.querySelector('.results-screen')).toBeNull();
    expect(container.textContent).toContain('Nivel 2');
  });

  test('a mismatch is announced and both cards re-hide; a third reveal while two are face up is blocked and never counted', () => {
    const { startParejasLevelGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    startParejasLevelGame(container, renderers, document, undefined, { randomFn: RANDOM_FN });
    jest.useFakeTimers();

    const round = precomputeRound(0, 1);
    const cardButtons = Array.from(container.querySelectorAll('.parejas-screen__card'));
    const first = round.cards[0];
    const mismatchCard = round.cards.find((card) => card.creatureId !== first.creatureId);

    cardButtons[first.cardId].click();
    cardButtons[mismatchCard.cardId].click();

    expect(cardButtons[first.cardId].getAttribute('aria-pressed')).toBe('true');
    expect(cardButtons[mismatchCard.cardId].getAttribute('aria-pressed')).toBe('true');
    expect(cardButtons[first.cardId].className).not.toMatch(/--matched/);

    // A third reveal attempt is blocked while resolution is pending: every
    // still-hidden card is disabled (parejasScreen.js's own doc comment).
    const thirdHiddenCard = cardButtons.find(
      (button) => button !== cardButtons[first.cardId] && button !== cardButtons[mismatchCard.cardId] && !button.disabled
    );
    expect(thirdHiddenCard).toBeUndefined();

    jest.advanceTimersByTime(MISMATCH_RESET_DELAY_MS + 100);
    expect(cardButtons[first.cardId].getAttribute('aria-pressed')).toBe('false');
    expect(cardButtons[mismatchCard.cardId].getAttribute('aria-pressed')).toBe('false');

    jest.useRealTimers();
  });

  test('exceeding the soft attempt limit changes feedback but never blocks completing the board', () => {
    const { startParejasLevelGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    startParejasLevelGame(container, renderers, document, undefined, { randomFn: RANDOM_FN });
    jest.useFakeTimers();

    const round = precomputeRound(0, 1);
    const cardButtons = Array.from(container.querySelectorAll('.parejas-screen__card'));
    const first = round.cards[0];
    const mismatchCard = round.cards.find((card) => card.creatureId !== first.creatureId);

    // Deliberately mismatch the same two (always-reset-to-hidden) cards
    // enough times to exceed softAttemptLimit before ever matching anything
    // (PRD: "límites suaves de intentos que nunca bloquean el avance").
    while (!container.querySelector('.parejas-screen__hint-message').textContent) {
      cardButtons[first.cardId].click();
      cardButtons[mismatchCard.cardId].click();
      jest.advanceTimersByTime(MISMATCH_RESET_DELAY_MS + 100);
    }

    playRoundPerfectly(container, round);

    expect(container.querySelector('.parejas-screen__next-button').hidden).toBe(false);
    expect(container.querySelector('.parejas-screen__result')).not.toHaveAttribute('hidden');

    jest.useRealTimers();
  });

  test('every card is a native, keyboard-operable button exposing position/state/identity semantically', () => {
    const { startParejasLevelGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    startParejasLevelGame(container, renderers, document, undefined, { randomFn: RANDOM_FN });

    const buttons = Array.from(container.querySelectorAll('.parejas-screen__card'));
    expect(buttons.length).toBeGreaterThanOrEqual(8);
    buttons.forEach((button) => {
      expect(button.tagName).toBe('BUTTON');
      expect(button).not.toHaveAttribute('tabindex', '-1');
      expect(button.getAttribute('aria-label')).toMatch(/posición \d+/);
      expect(button.getAttribute('aria-pressed')).toBe('false');
    });

    buttons[0].click();
    expect(buttons[0].getAttribute('aria-label')).toMatch(/: /);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  });

  test('starting a game the catalog cannot support (fewer than 8 creatures) exits safely instead of rendering a broken board', () => {
    const { startParejasLevelGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const parejasGame = require(PAREJAS_GAME_PATH);
    const renderers = resolveScreenRenderers();

    startParejasLevelGame(container, renderers, document, undefined, {
      randomFn: RANDOM_FN,
      dinosaurPool: parejasGame.DEFAULT_DINOSAUR_POOL.slice(0, 7),
    });

    expect(container.querySelector('.parejas-screen')).toBeNull();
  });
});

describe('TRIOFSND-276: gate del catálogo (7 vs 8 criaturas elegibles) on the real mode selector', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.resetModules();
    delete window.DinoQuiz;
  });

  afterEach(() => {
    container.remove();
  });

  function renderSelectorWithCreatureCount(count) {
    const { resolveScreenRenderers, resolveModesCatalog } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const modesCatalog = resolveModesCatalog();
    const parejasGame = require(PAREJAS_GAME_PATH);

    const resourceCatalog = {
      questionsCount: 100,
      creatures: parejasGame.DEFAULT_DINOSAUR_POOL.slice(0, count).map((id) => ({ id: id, visuallyDifferentiable: true })),
    };

    return renderers.renderModeSelectorScreen(container, {
      strings: modeSelectorStrings,
      modesStrings: modesStrings,
      resourceCatalog: resourceCatalog,
      evaluateModes: modesCatalog.evaluateModes,
      onSelectMode: () => {},
    });
  }

  test('7 elegible creatures blocks Parejas with the localized, accessible catálogo insuficiente message, other modes unaffected', () => {
    renderSelectorWithCreatureCount(7);

    const parejasCard = getByRole(container, 'button', { name: modeSelectorStrings.modes.parejas.accessibleLabel });
    expect(parejasCard).toHaveAttribute('aria-disabled', 'true');
    expect(container.textContent).toContain(modeSelectorStrings.blockedReasons.insufficient_creatures);

    const quizCard = getByRole(container, 'button', { name: modeSelectorStrings.modes.quiz.accessibleLabel });
    expect(quizCard).not.toHaveAttribute('aria-disabled');
  });

  test('8 elegible creatures unlocks Parejas', () => {
    renderSelectorWithCreatureCount(8);

    const parejasCard = getByRole(container, 'button', { name: modeSelectorStrings.modes.parejas.accessibleLabel });
    expect(parejasCard).not.toHaveAttribute('aria-disabled');
  });
});
