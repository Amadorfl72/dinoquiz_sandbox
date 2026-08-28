'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-282: covers the Clasifica integration end to end -- reaching the
 * mode by actually tapping its card on the illustrated mode selector
 * (public/scripts/modeSelectorScreen.js, via main.js's `renderModeSelector`/
 * `handleModeSelected`), playing a full 10-round game with the device
 * reporting no network connectivity at all (mirrors
 * tests/pwa/offline-maze-game.test.js's own TRIOFSND-259 coverage for
 * Laberinto), and the `dinoquiz:lastMode` state main.js drives for every
 * mode.
 *
 * The card is reachable and tappable here because
 * `src/data/creatureSheet.js`'s roster already verifies a creature of each
 * diet -- Pachycephalosaurus is omnivoro (its own funFacts "-02"/"-16"
 * already describe a mixed plant-and-animal diet; see that file's comment on
 * the entry) -- and main.js's `evaluateModesWithShadowOverride` overrides the
 * Clasifica card's verdict with the real `isClassifyModeUnlocked` check
 * (mirroring the Sombra override already in place for TRIOFSND-265) instead
 * of leaving it pinned to modesCatalog.js's still-generic placeholder.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const CLASSIFY_GAME_PATH = path.resolve(__dirname, '../../public/scripts/classifyGame.js');
const i18n = require('../../public/i18n/es.json');
const { results: resultsStrings, modeSelector: modeSelectorStrings, modes: modesStrings } = i18n;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

function buildResources() {
  return { modeSelector: modeSelectorStrings, modes: modesStrings };
}

/** Resolves the dinosaur id the board is currently showing from the creature `<img>`'s src, so each round can be answered with its real, verified diet category. */
function currentDinosaurId(container) {
  const src = container.querySelector('.classify-screen__creature-image').getAttribute('src');
  return src.replace(/^.*\/dinosaurs\//, '').replace(/\.svg$/, '');
}

function clickCategory(container, classifyGameApi, category) {
  const order = Object.keys(classifyGameApi.CATEGORIES).map((key) => classifyGameApi.CATEGORIES[key]);
  const buttons = container.querySelectorAll('.classify-screen__category-button');
  buttons[order.indexOf(category)].click();
}

/** Taps a mode selector card by its accessible label, the same real interaction a player performs (mirrors tests/pwa/mode-change-flow.test.js's own clickModeCard). */
function clickModeCard(container, modeId) {
  getByRole(container, 'button', { name: modeSelectorStrings.modes[modeId].accessibleLabel }).click();
}

/** Flushes the real (non-fake) timer/microtask queue so handleModeSelected's async incomplete-game check settles before assertions run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Plays every round of the in-progress Clasifica game to completion, always answering correctly, ending on Resultados. */
function playFullGame(container, classifyGameApi) {
  for (let i = 0; i < classifyGameApi.ROUNDS_PER_GAME; i += 1) {
    const dinosaurId = currentDinosaurId(container);
    const diet = classifyGameApi.resolveVerifiedDiet(dinosaurId).diet;
    clickCategory(container, classifyGameApi, diet);
    const nextButton = container.querySelector('.classify-screen__next-button');
    expect(nextButton.hidden).toBe(false);
    nextButton.click();
  }
}

describe('TRIOFSND-282: Clasifica reachable via the mode selector, plays a full offline game', () => {
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

  test('tapping the Clasifica card on the real mode selector starts a full offline game, ending on Resultados with a normalized score', async () => {
    global.fetch = rejectingFetch();

    const { renderModeSelector, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const classifyGameApi = require(CLASSIFY_GAME_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();

    renderModeSelector(container, renderers, questions, document, undefined, buildResources(), {
      randomFn: () => 0.5,
    });

    expect(
      getByRole(container, 'button', { name: modeSelectorStrings.modes.clasifica.accessibleLabel })
    ).not.toHaveAttribute('aria-disabled');

    clickModeCard(container, 'clasifica');
    await flush();

    expect(container.querySelector('.classify-screen')).not.toBeNull();

    playFullGame(container, classifyGameApi);

    expect(getByRole(container, 'heading', { name: resultsStrings.heading })).toBeInTheDocument();
    expect(container.textContent).toContain('10/10');
    expect(container.querySelector('.results-screen__stars')).toHaveAttribute(
      'aria-label',
      resultsStrings.starsLabel.replace('{stars}', '3').replace('{maxStars}', '3')
    );

    // Last-mode restoration (TRIOFSND-230/282): remembered under dinoquiz:lastMode.
    expect(window.localStorage.getItem('dinoquiz:lastMode')).toBe('"clasifica"');

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('"Volver a jugar" starts a fresh Clasifica game after Resultados', () => {
    global.fetch = rejectingFetch();

    const { startClassifyGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const classifyGameApi = require(CLASSIFY_GAME_PATH);
    const renderers = resolveScreenRenderers();

    startClassifyGame(container, renderers, document, undefined, { level: 1, randomFn: () => 0.5 });
    playFullGame(container, classifyGameApi);

    getByRole(container, 'button', { name: resultsStrings.playAgainButton }).click();

    expect(container.querySelector('.classify-screen')).not.toBeNull();
    expect(container.querySelector('.results-screen')).toBeNull();
  });
});
