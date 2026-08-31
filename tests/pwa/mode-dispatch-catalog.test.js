'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * Catalog-derived dispatch coverage: modesCatalog.js (src/game/modesCatalog.js,
 * re-exporting public/scripts/modesCatalog.js) is the single source of truth
 * for the eight mode ids the PRD commits to. This suite reads that catalog --
 * never a hand-written id list -- renders the real illustrated selector via
 * main.js's `renderModeSelector`/`resolveScreenRenderers` (mirrors
 * tests/pwa/offline-size-order-game.test.js's own pattern) and taps every
 * mode it offers, the same way a player would.
 *
 * The catalog's own availability gate (buildCurrentResourceCatalog) is
 * deliberately bypassed here via a `modesCatalog.evaluateModes` mock that
 * reports every mode "available" -- that gate is a separate, evolving,
 * already-covered concern (creature-sheet field coverage), and leaving it in
 * place would hide the dispatch question this suite exists to answer behind
 * "is there enough data yet". Sombra/Clasifica/Ordena por tamaño still run
 * through their own real isXModeUnlocked() overrides in
 * `evaluateModesWithShadowOverride` regardless of this mock (those never
 * consult modesCatalog.evaluateModes's return value), so this only affects
 * the plain, ungated ids: quiz, laberinto, oidoJurasico, parejas,
 * lineaDelTiempo.
 *
 * For every mode except Quiz itself, tapping its (now-offered) card must
 * land on that mode's OWN dedicated screen -- never on `.question-screen`,
 * the shared quiz orchestrator's screen. `lineaDelTiempo` is included in the
 * generic, catalog-driven loop below: main.js's `handleModeSelected` now has
 * a dispatch case for it (`startTimelineGame`, driving
 * `src/game/timelineRound.js`'s round/level orchestrator and
 * `public/scripts/timelineScreen.js`'s `.timeline-screen`), so it lands on
 * its own screen exactly like every other already-wired mode instead of
 * silently falling through to `startLevelGame`/`.question-screen`, the exact
 * "quiz silencioso" the PRD flags this suite as guarding against.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const MODES_CATALOG_PATH = path.resolve(__dirname, '../../public/scripts/modesCatalog.js');
const i18n = require('../../public/i18n/es.json');
const { modeSelector: modeSelectorStrings, modes: modesStrings } = i18n;
const modesCatalog = require('../../src/game/modesCatalog');

// The screen every already-wired, non-Quiz mode must land on once tapped --
// read straight off each mode's own screen module (public/scripts/
// *Screen.js's own `root.className`), never guessed.
const OWN_SCREEN_SELECTORS = {
  laberinto: '.maze-screen',
  sombra: '.shadow-guess-screen',
  oidoJurasico: '.oido-jurasico-intro',
  parejas: '.parejas-screen',
  clasifica: '.classify-screen',
  ordenaPorTamano: '.size-order-screen',
  lineaDelTiempo: '.timeline-screen',
};

const QUIZ_MODE_ID = 'quiz';
const SILENT_QUIZ_SELECTOR = '.question-screen';

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

/** Flushes the real (non-fake) timer/microtask queue so any async post-tap check settles before assertions run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Forces every catalog mode "available" -- see the suite doc comment for why. */
function mockEveryModeAvailable() {
  jest.doMock(MODES_CATALOG_PATH, () => {
    const real = jest.requireActual(MODES_CATALOG_PATH);
    return Object.assign({}, real, {
      evaluateModes: (catalog, modes) =>
        (modes || real.MODES_CATALOG).map((mode) => ({
          modeId: mode.id,
          available: true,
          cause: null,
          details: null,
        })),
    });
  });
}

describe('mode dispatch derived from modesCatalog.js: tapping every offered mode must start that same mode, never a silent quiz', () => {
  let container;
  let hadOwnFetch;
  let originalFetch;

  beforeEach(() => {
    window.location.hash = '';
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
    window.location.hash = '';
    jest.dontMock(MODES_CATALOG_PATH);
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  });

  modesCatalog.MODES_CATALOG.forEach((mode) => {
    test(`tapping "${mode.id}" on the real selector starts "${mode.id}" itself, never the silent quiz`, async () => {
      global.fetch = rejectingFetch();
      mockEveryModeAvailable();

      const { renderModeSelector, resolveScreenRenderers, renderRoute } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = require('../../src/data/questionBank').loadQuestionBank();

      renderModeSelector(container, renderers, questions, document, undefined, buildResources(), {
        randomFn: () => 0.5,
      });

      // The catalog-derived id must actually be offered (forced above) --
      // the whole point is to observe dispatch, not the availability gate.
      expect(
        getByRole(container, 'button', { name: modeSelectorStrings.modes[mode.id].accessibleLabel })
      ).not.toHaveAttribute('aria-disabled');

      clickModeCard(container, mode.id);
      await flush();

      // Laberinto/Oído Jurásico dispatch via `location.hash` -- the real
      // hashchange listener that renders it only self-attaches outside
      // Node/Jest (main.js's own bootstrap guard), so this drives the exact
      // same `renderRoute` it would call, mirroring
      // tests/pwa/offline-maze-game.test.js's own pattern.
      if (window.location.hash) {
        renderRoute(document, undefined, window.location);
        await flush();
      }

      // The id iniciado (what dinoquiz:lastMode records the moment a mode
      // starts) must match the id tapped -- for every mode, not just the
      // ones with their own engine.
      expect(window.localStorage.getItem('dinoquiz:lastMode')).toBe(JSON.stringify(mode.id));

      if (mode.id === QUIZ_MODE_ID) {
        // Quiz is the one mode for which `.question-screen` IS the correct,
        // dedicated destination.
        expect(container.querySelector(SILENT_QUIZ_SELECTOR)).not.toBeNull();
        return;
      }

      // Every other mode must never silently fall back to the quiz screen --
      // it must land on its own dedicated screen instead.
      expect(container.querySelector(SILENT_QUIZ_SELECTOR)).toBeNull();
      expect(container.querySelector(OWN_SCREEN_SELECTORS[mode.id])).not.toBeNull();
    });
  });
});
