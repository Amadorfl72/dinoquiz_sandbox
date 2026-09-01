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
 * The id "started" is asserted from two independent signals, neither of
 * which is a DOM class or `dinoquiz:lastMode` storage read:
 *
 *   1. `dinoquiz:match_started` -- a DOM `CustomEvent` main.js's
 *      `handleModeSelected`/`startMode()` dispatches on `document`, once per
 *      dispatch, carrying the *true* identity of the engine that is
 *      actually about to start -- not simply an echo of the id tapped.
 *      Every `start*Game` branch reports its own literal mode id, and the
 *      shared question-bank fallback (used by Quiz, and by any mode that
 *      isn't wired to its own engine yet) always reports the literal
 *      `QUIZ_MODE_ID`, regardless of which `modeId` reached it -- see
 *      `emitMatchStarted`'s own doc comment in main.js. That's what makes
 *      this a meaningful "id iniciado" check rather than a tautology: a
 *      mode that silently falls through to Quiz's engine reports having
 *      started `'quiz'`, so `expect(matchStarted.ids).toEqual([mode.id])`
 *      fails for it. This is the primary "id iniciado" assertion below.
 *   2. Each mode's own screen module (`src/screens/*Screen.js`'s exported
 *      `render*Screen`), the function every `start*Game` dispatch branch in
 *      main.js's `handleModeSelected` calls to paint that mode's first
 *      screen -- whether reached directly (Sombra/Parejas/Clasifica/Ordena
 *      por tamaño/Línea del tiempo/Quiz) or via a hash route re-resolved
 *      through `renderRoute` (Laberinto/Oído Jurásico, whose
 *      `renderMazeRoute`/`renderOidoJurasicoRoute` call
 *      `resolveScreenRenderers()` again instead of reusing the selector's
 *      own renderers object -- spying on the shared module export, not on
 *      one particular `renderers` object instance, survives that
 *      re-resolution). This corroborates (1) with an independent code path.
 *
 * `OWN_SCREEN_SELECTORS` is kept as a third, user-facing signal: the tapped
 * mode's dedicated screen must be the one visible on screen, and no other
 * mode's screen (`.question-screen` included) may be present.
 *
 * Bite, verified: with `lineaDelTiempo`'s dispatch branch in main.js's
 * `startMode()` temporarily removed, this suite's `tapping "lineaDelTiempo"
 * ...` test fails red on both signals -- `matchStarted.ids` comes back
 * `['quiz']` instead of `['lineaDelTiempo']`, and
 * `engineRendererSpies.lineaDelTiempo` is never called -- because dispatch
 * silently fell through to the shared quiz orchestrator instead; every
 * other mode still passes. Restoring the branch turns it green again. That
 * fall-through is the exact regression TRIOFSND commits
 * cece844/2d4016d document (red, then the fix) earlier in this branch's own
 * history. `parejas` was already wired by the separately merged Parejas
 * jurásicas integration (PR #326, predates this branch) and has never
 * regressed here, so no red run exists for it on this branch -- the suite
 * still covers it on equal footing with every other catalog id, so any
 * future regression fails the same way lineaDelTiempo's did.
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

// The screen module + exported render function each mode's own engine calls
// to paint its first screen -- read straight off main.js's own dispatch code
// (grep for `renderers.render` inside each `start*Game`/`play*Round`
// function) and `resolveScreenRenderers`'s own require paths. This is the
// "id iniciado" signal itself: whichever export here gets called is the mode
// that actually started, independent of what CSS class ended up on the page
// or which particular `renderers` object instance was in play.
const MODE_RENDERER_SOURCES = {
  quiz: { modulePath: '../../src/screens/QuestionScreen', exportName: 'renderQuestionScreen' },
  laberinto: { modulePath: '../../src/screens/MazeScreen', exportName: 'renderMazeScreen' },
  sombra: { modulePath: '../../src/screens/ShadowGuessScreen', exportName: 'renderShadowGuessScreen' },
  oidoJurasico: { modulePath: '../../src/screens/OidoJurasicoScreen', exportName: 'renderOidoJurasicoIntro' },
  parejas: { modulePath: '../../src/screens/ParejasScreen', exportName: 'renderParejasScreen' },
  clasifica: { modulePath: '../../src/screens/ClassifyScreen', exportName: 'renderClassifyScreen' },
  ordenaPorTamano: { modulePath: '../../src/screens/SizeOrderScreen', exportName: 'renderSizeOrderScreen' },
  lineaDelTiempo: { modulePath: '../../src/screens/TimelineScreen', exportName: 'renderTimelineScreen' },
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

/**
 * Listens for `dinoquiz:match_started` on `document` and records every
 * `detail.modeId` it carries -- the "id iniciado" signal itself (see the
 * suite doc comment), captured at its source instead of inferred from a
 * screen render. Call `stop()` once assertions are done to detach.
 */
function captureMatchStartedIds(doc) {
  const ids = [];
  function onMatchStarted(event) {
    ids.push(event && event.detail && event.detail.modeId);
  }
  doc.addEventListener('dinoquiz:match_started', onMatchStarted);
  return {
    ids,
    stop: () => doc.removeEventListener('dinoquiz:match_started', onMatchStarted),
  };
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

/**
 * Wraps every known mode screen module's export in a jest spy that still
 * calls through, so dispatch can be observed -- however main.js re-resolves
 * its renderers -- without altering rendered output.
 *
 * Each `public/scripts/*Screen.js` registers its render function in *two*
 * independent places once required under jsdom (a real `window` exists in
 * Node/Jest too): the CommonJS `module.exports` AND
 * `window.DinoQuiz.screens.render*Screen` (its browser `<script>` bridge --
 * see e.g. public/scripts/questionScreen.js's own tail). `resolveScreenRenderers`
 * (main.js) prefers that `window.DinoQuiz.screens` copy whenever it's already
 * populated, which it always is by the time this runs (renderModeSelector's
 * own resolveScreenRenderers() call, earlier in the same test, requires --
 * and thus registers -- every screen module). A `jest.spyOn` on only the
 * `module.exports` property would silently miss every call, since dispatch
 * would keep reading the untouched `window.DinoQuiz.screens` copy -- so the
 * same spy function is installed on both, whichever one `resolveScreenRenderers`
 * ends up reading.
 */
function spyOnEngineRenderers() {
  const spies = {};
  Object.keys(MODE_RENDERER_SOURCES).forEach((modeId) => {
    const { modulePath, exportName } = MODE_RENDERER_SOURCES[modeId];
    // Requiring the screen module is what populates `window.DinoQuiz.screens`
    // (its own bridge tail runs on require, jsdom always provides `window`),
    // so that lookup only happens after -- never before -- this require.
    const screenModule = require(modulePath);
    const original = screenModule[exportName];
    if (typeof original !== 'function') {
      return;
    }
    const spy = jest.fn(original);
    Object.assign(spy, original);
    screenModule[exportName] = spy;
    const windowScreens = window.DinoQuiz && window.DinoQuiz.screens;
    if (windowScreens && typeof windowScreens[exportName] === 'function') {
      windowScreens[exportName] = spy;
    }
    spies[modeId] = spy;
  });
  return spies;
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
    jest.restoreAllMocks();
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

      const engineRendererSpies = spyOnEngineRenderers();
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

      const matchStarted = captureMatchStartedIds(document);

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

      matchStarted.stop();

      // The id iniciado in `dinoquiz:match_started` -- main.js's own
      // dispatch-decision signal -- must equal the id tapped, exactly once,
      // for every catalog mode.
      expect(matchStarted.ids).toEqual([mode.id]);

      // Corroborating signal: which mode's own screen renderer main.js
      // actually invoked must agree with (1) above.
      expect(engineRendererSpies[mode.id]).toHaveBeenCalled();
      Object.keys(engineRendererSpies)
        .filter((otherModeId) => otherModeId !== mode.id)
        .forEach((otherModeId) => {
          expect(engineRendererSpies[otherModeId]).not.toHaveBeenCalled();
        });

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

  modesCatalog.MODES_CATALOG.filter((mode) => mode.id !== QUIZ_MODE_ID).forEach((mode) => {
    test(`"${mode.id}", under the real (unmocked) catalog gate, is either withheld from the selector or never silently starts the quiz`, async () => {
      global.fetch = rejectingFetch();
      // Real, unmocked catalog gate here -- exercises the shipped, current
      // behaviour a player actually sees today for a mode that isn't fully
      // wired or doesn't have enough verified creature data yet: it must
      // never be offered as playable and then silently fall into the quiz.
      const { renderModeSelector, resolveScreenRenderers, renderRoute } = require(MAIN_JS_PATH);
      const renderers = resolveScreenRenderers();
      const questions = require('../../src/data/questionBank').loadQuestionBank();

      renderModeSelector(container, renderers, questions, document, undefined, buildResources(), {
        randomFn: () => 0.5,
      });

      const button = getByRole(container, 'button', {
        name: modeSelectorStrings.modes[mode.id].accessibleLabel,
      });

      if (button.getAttribute('aria-disabled') === 'true') {
        // Acceptable today: a mode without enough verified data (or without
        // its own engine yet) is correctly withheld from play instead of
        // ever being tapped -- "no se ofrece como jugable".
        return;
      }

      const matchStarted = captureMatchStartedIds(document);

      clickModeCard(container, mode.id);
      await flush();

      // Laberinto/Oído Jurásico dispatch via `location.hash` -- see the
      // primary loop above for why this drives `renderRoute` explicitly.
      if (window.location.hash) {
        renderRoute(document, undefined, window.location);
        await flush();
      }

      matchStarted.stop();

      // Offered and tapped: the id iniciado must be the id tapped, and
      // dispatch must never silently fall through to the shared quiz
      // orchestrator's screen -- "cae en un aviso visible en vez del quiz
      // silencioso" -- it must land on its own screen.
      expect(matchStarted.ids).toEqual([mode.id]);
      expect(container.querySelector(SILENT_QUIZ_SELECTOR)).toBeNull();
      expect(container.querySelector(OWN_SCREEN_SELECTORS[mode.id])).not.toBeNull();
    });
  });
});
