'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * Catalog-derived dispatch coverage (bite test): modesCatalog.js
 * (src/game/modesCatalog.js, re-exporting public/scripts/modesCatalog.js) is
 * the single source of truth for the eight mode ids the PRD commits to. This
 * suite reads that catalog directly -- never a hand-written id list -- and
 * exercises the real user flow (render the illustrated selector via
 * main.js's own `renderModeSelector`/`resolveScreenRenderers`, locate the
 * card, tap it) to prove every mode a player can pick starts *that exact*
 * mode's own screen/engine, never a silent fall-through to the shared quiz
 * orchestrator (`.question-screen`).
 *
 * Two concerns, two describe blocks:
 *
 * 1. "despacho" -- is tapping id X wired to X's own destination? This is a
 *    pure dispatch question, independent of whether X happens to be offered
 *    by today's resource catalog, so every card is forced "available" via
 *    `renderModeSelectorScreen`'s own documented `evaluateModes` test seam
 *    (see modeSelectorScreen.js's `resolveAvailability` doc comment: "what
 *    tests use to exercise available/blocked cards without a real resource
 *    catalog"). This never stubs `renderers`/`onSelectMode` -- the real
 *    `handleModeSelected`/`startMode` switch inside main.js still runs, so a
 *    missing dispatch case still falls through to `startLevelGame` and
 *    lands on `.question-screen`, exactly the defect this suite exists to
 *    catch. `lineaDelTiempo` has no case in that switch today, so it MUST
 *    fail here until its own integration ships; `parejas` already does.
 *
 * 2. "disponibilidad" -- does the selector correctly tell offered mode ids
 *    from blocked ones, using the real, unmocked availability evaluator
 *    (`evaluateModesWithShadowOverride`)? A blocked id must render an
 *    explicit, i18n-sourced, screen-reader-announceable reason without
 *    disabling any other card, and must never silently start a game.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const MODES_CATALOG_PATH = path.resolve(__dirname, '../../public/scripts/modesCatalog.js');
const i18n = require('../../public/i18n/es.json');
const { modeSelector: modeSelectorStrings, modes: modesStrings } = i18n;
const modesCatalog = require('../../src/game/modesCatalog');

const QUIZ_MODE_ID = 'quiz';
const SILENT_QUIZ_SELECTOR = '.question-screen';
const MAZE_HASH = '#/laberinto';
const OIDO_JURASICO_HASH = '#/oido-jurasico';

// Explicit id -> destination signal correspondence, read straight off each
// mode's own screen module (`root.className`) or the hash route it
// navigates to -- never guessed, never a visual/text match. A catalog id
// with no entry here fails loudly (see the `it.each` guard below) instead
// of silently passing, so a newly-added catalog id can never slip through
// this suite unmapped.
const DESTINATION_SIGNALS = {
  quiz: { kind: 'screen', selector: SILENT_QUIZ_SELECTOR },
  laberinto: { kind: 'hash', hash: MAZE_HASH, selector: '.maze-screen' },
  sombra: { kind: 'screen', selector: '.shadow-guess-screen' },
  oidoJurasico: { kind: 'hash', hash: OIDO_JURASICO_HASH, selector: '.oido-jurasico-intro' },
  parejas: { kind: 'screen', selector: '.parejas-screen' },
  clasifica: { kind: 'screen', selector: '.classify-screen' },
  ordenaPorTamano: { kind: 'screen', selector: '.size-order-screen' },
  lineaDelTiempo: { kind: 'screen', selector: '.timeline-screen' },
};

const ALL_DESTINATION_SELECTORS = Array.from(
  new Set(Object.keys(DESTINATION_SIGNALS).map((id) => DESTINATION_SIGNALS[id].selector))
);

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

function buildResources() {
  return { modeSelector: modeSelectorStrings, modes: modesStrings };
}

/** Locates a mode card by its real accessible label, the same way a player finds it. */
function findModeCard(container, modeId) {
  return getByRole(container, 'button', { name: modeSelectorStrings.modes[modeId].accessibleLabel });
}

/** Flushes the real (non-fake) timer/microtask queue so any async post-tap dispatch settles before assertions run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Forces every catalog mode "available" via modesCatalog.js's own
 * `evaluateModes`, the documented seam `renderModeSelectorScreen` reads
 * through `resolveAvailability` -- this only changes which cards are
 * offered, it never touches `renderers`/`onSelectMode`, so a tap still runs
 * the real `handleModeSelected` -> `startMode` dispatch.
 */
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

function renderRealSelector(container, ctx) {
  const { renderModeSelector, resolveScreenRenderers } = require(MAIN_JS_PATH);
  const renderers = resolveScreenRenderers();
  const questions = require('../../src/data/questionBank').loadQuestionBank();
  renderModeSelector(container, renderers, questions, document, undefined, buildResources(), ctx || {});
}

describe('despacho derivado de modesCatalog.js: pulsar cada modo inicia su propio destino, nunca el quiz silencioso', () => {
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
    const signal = DESTINATION_SIGNALS[mode.id];

    test(`despacho "${mode.id}" -> ${signal ? signal.selector : 'SIN SEÑAL DE DESTINO MAPEADA'}`, async () => {
      if (!signal) {
        throw new Error(
          'mode-dispatch-catalog.test.js no tiene una señal de destino mapeada para el id de catálogo "' +
            mode.id +
            '". Añade una entrada en DESTINATION_SIGNALS antes de confiar en su despacho.'
        );
      }

      global.fetch = rejectingFetch();
      mockEveryModeAvailable();

      renderRealSelector(container, { randomFn: () => 0.5 });

      // Forced above -- the whole point here is to observe dispatch, not
      // the availability gate (that is the second describe block's job).
      expect(findModeCard(container, mode.id)).not.toHaveAttribute('aria-disabled');

      const selectedModeId = mode.id;
      findModeCard(container, selectedModeId).click();
      await flush();

      if (signal.kind === 'hash') {
        // Laberinto/Oído Jurásico dispatch via `location.hash` -- the real
        // hashchange listener only self-attaches outside Node/Jest (main.js's
        // own bootstrap guard), so this drives the exact same `renderRoute`
        // it would call, mirroring tests/pwa/offline-maze-game.test.js.
        expect(window.location.hash).toBe(signal.hash);
        const { renderRoute } = require(MAIN_JS_PATH);
        renderRoute(document, undefined, window.location);
        await flush();
      }

      // The id iniciado (what dinoquiz:lastMode records the moment a mode
      // starts) must match the id tapped, for every mode.
      expect(window.localStorage.getItem('dinoquiz:lastMode')).toBe(JSON.stringify(selectedModeId));

      if (selectedModeId === QUIZ_MODE_ID) {
        // Quiz is the one id for which `.question-screen` IS the correct,
        // dedicated destination.
        expect(container.querySelector(SILENT_QUIZ_SELECTOR)).not.toBeNull();
        return;
      }

      // Never a silent fall-through to the quiz orchestrator...
      expect(container.querySelector(SILENT_QUIZ_SELECTOR)).toBeNull();
      // ...and never another mode's destination either -- only its own.
      ALL_DESTINATION_SELECTORS.filter((selector) => selector !== signal.selector).forEach((otherSelector) => {
        expect(container.querySelector(otherSelector)).toBeNull();
      });
      expect(container.querySelector(signal.selector)).not.toBeNull();
    });
  });
});

describe('disponibilidad derivada de modesCatalog.js: el selector real distingue modos ofrecidos de modos bloqueados', () => {
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
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  });

  modesCatalog.MODES_CATALOG.forEach((mode) => {
    test(`tarjeta real de "${mode.id}": ofrecida y pulsable, o bloqueada de forma explícita y accesible`, async () => {
      global.fetch = rejectingFetch();

      // No availability override here: this exercises main.js's real,
      // unmocked evaluator (evaluateModesWithShadowOverride).
      renderRealSelector(container);

      const card = findModeCard(container, mode.id);
      const isOffered = card.getAttribute('aria-disabled') !== 'true';

      if (isOffered) {
        expect(card.className).toContain('mode-selector-screen__card--available');
        return;
      }

      // Blocked: card stays a real, focusable, clickable button (never
      // native `disabled`, which assistive tech would skip reading), with
      // an explicit, i18n-sourced reason wired into its accessible
      // description.
      expect(card.className).toContain('mode-selector-screen__card--blocked');
      expect(card).not.toBeDisabled();

      const describedById = card.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();
      const description = document.getElementById(describedById);
      expect(description).not.toBeNull();
      expect(description.textContent).toContain(modeSelectorStrings.status.blocked);

      const reasonNode = description.querySelector('.mode-selector-screen__card-reason');
      expect(reasonNode).not.toBeNull();
      expect(reasonNode.textContent.length).toBeGreaterThan(0);
      expect(Object.values(modeSelectorStrings.blockedReasons)).toContain(reasonNode.textContent);

      // Tapping it never silently starts a game -- it stays on the selector.
      card.click();
      await flush();
      expect(container.querySelector('.mode-selector-screen')).not.toBeNull();
      expect(container.querySelector(SILENT_QUIZ_SELECTOR)).toBeNull();

      // Blocking this mode never blocks the others: every other card the
      // selector currently offers remains untouched and selectable.
      modesCatalog.MODES_CATALOG.filter((other) => other.id !== mode.id).forEach((other) => {
        const otherCard = findModeCard(container, other.id);
        if (otherCard.getAttribute('aria-disabled') !== 'true') {
          expect(otherCard).not.toBeDisabled();
        }
      });

      // A functional way back to the selector is always present -- the
      // selector's own back button, since a blocked tap never navigates
      // away from it in the first place.
      const backButton = getByRole(container, 'button', { name: modeSelectorStrings.backButtonLabel });
      backButton.click();
      await flush();
      expect(container.querySelector('.home-screen')).not.toBeNull();
    });
  });
});
