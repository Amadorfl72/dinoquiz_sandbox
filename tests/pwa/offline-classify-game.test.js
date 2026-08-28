'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-282: covers the Clasifica integration end to end -- reaching the
 * mode via main.js's `handleModeSelected` (the handler every mode selector
 * card tap routes through, public/scripts/modeSelectorScreen.js), playing a
 * full 10-round game with the device reporting no network connectivity at
 * all (mirrors tests/pwa/offline-maze-game.test.js's own TRIOFSND-259
 * coverage for Laberinto), and the `dinoquiz:lastMode` state main.js drives
 * for every mode.
 *
 * `handleModeSelected` is exercised directly instead of clicking the actual
 * selector card: modesCatalog.js's generic MIN_CREATURES_WITH_FIELD
 * requirement for Clasifica needs a verified omnivoro creature, and today's
 * roster (src/data/creatureSheet.js) has none yet -- a real content gap
 * outside this ticket's scope (registering the script, wiring the route,
 * precaching its assets), never something to fake here. The card will
 * unblock itself, with no further wiring changes, once that creature ships.
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

  test('selecting the Clasifica card (handleModeSelected) starts a full offline game, ending on Resultados with a normalized score', () => {
    global.fetch = rejectingFetch();

    const { handleModeSelected, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const classifyGameApi = require(CLASSIFY_GAME_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();

    handleModeSelected(
      container,
      renderers,
      questions,
      document,
      undefined,
      buildResources(),
      { randomFn: () => 0.5 },
      'clasifica',
      null
    );

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
