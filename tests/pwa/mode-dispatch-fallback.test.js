'use strict';

/**
 * TRIOFSND-322: generic mode dispatcher coverage for public/scripts/main.js's
 * `handleModeSelected`/`startMode`, refactored from an if/else chain into an
 * explicit mode->renderer registry (`buildModeDispatchRegistry`, built from
 * `resolveScreenRenderers()`). Every entry is gated on `renderers` actually
 * exposing that mode's own screen-render function -- a `modeId` with no
 * entry (an id modesCatalog.js doesn't declare at all, or a known id whose
 * own renderer failed to load) must show the accessible fallback warning
 * screen (modeFallbackWarningScreen.js) with a way back to the selector,
 * instead of ever silently starting Quiz for a mode nobody chose.
 *
 * Also covers the four local, aggregated analytics events (plus their
 * `mode_id`/`cause`/`resolved_mode_id` detail payloads)
 * src/services/analytics.js records for the dispatcher: `mode_selected`
 * (every tap that reaches `startMode`), `match_started` (every mode that
 * actually starts), `mode_blocked` (a known mode with no valid destination --
 * missing renderer/dependencies, an unknown id, or a blocked selector card
 * tapped anyway) and `mode_dispatch_mismatch` (the registry resolved a
 * destination whose own mode id disagrees with the one selected).
 *
 * Bite, verified for parejas and lineaDelTiempo specifically (see "un
 * renderer ausente bloquea únicamente ese modo" below): `startParejasLevelGame`/
 * `startTimelineLevelGame` (public/scripts/main.js) both silently
 * `return null` when their own `renderers.renderParejasScreen`/
 * `renderTimelineScreen` is missing -- before `buildModeDispatchRegistry`
 * gated its entries on that same check, the registry still held an
 * unconditional entry for both ids, so dispatch reached that silent no-op
 * instead of ever falling into the "no entry" branch: no fallback screen
 * rendered, no `mode_blocked` recorded, nothing visible happened at all.
 * The two tests below reproduce exactly that renderer-missing input through
 * the real `handleModeSelected` and fail on the unfixed registry (no
 * `.mode-fallback-warning-screen`, no `mode_blocked` count) while passing on
 * the current, gated `buildModeDispatchRegistry`.
 */

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole, getByText } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const i18n = require('../../public/i18n/es.json');
const {
  modeSelector: modeSelectorStrings,
  modes: modesStrings,
  modeFallbackWarning: modeFallbackWarningStrings,
} = i18n;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

function buildResources() {
  return { modeSelector: modeSelectorStrings, modes: modesStrings, modeFallbackWarning: modeFallbackWarningStrings };
}

/** Shallow copy of a real `resolveScreenRenderers()` result with one export deleted, simulating that renderer's script having failed to load. */
function withRendererRemoved(renderers, exportName) {
  const copy = Object.assign({}, renderers);
  delete copy[exportName];
  return copy;
}

describe('TRIOFSND-322: registro modo->renderer y aviso de fallback (red desactivada)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    delete window.DinoQuiz;
    window.localStorage.clear();
    goOffline();
    global.fetch = rejectingFetch();
  });

  afterEach(() => {
    container.remove();
  });

  test('a modeId sin renderer registrado muestra el aviso de fallback en vez de caer en Quiz', () => {
    const { handleModeSelected, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();

    handleModeSelected(container, renderers, questions, document, undefined, buildResources(), {}, 'modo-inexistente', null);

    expect(container.querySelector('.mode-fallback-warning-screen')).not.toBeNull();
    expect(container.querySelector('.question-screen')).toBeNull();
    expect(getByText(container, modeFallbackWarningStrings.screenTitle)).toBeInTheDocument();
  });

  test('el botón "volver" del aviso de fallback regresa al selector de modos', () => {
    const { handleModeSelected, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();

    handleModeSelected(container, renderers, questions, document, undefined, buildResources(), {}, 'modo-inexistente', null);
    getByRole(container, 'button', { name: modeFallbackWarningStrings.backButtonLabel }).click();

    expect(container.querySelector('.mode-fallback-warning-screen')).toBeNull();
    expect(container.querySelector('.mode-selector-screen')).not.toBeNull();
  });

  test('un modeId con renderer registrado (quiz) nunca muestra el aviso de fallback', () => {
    const { handleModeSelected, resolveScreenRenderers, QUIZ_MODE_ID } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();

    handleModeSelected(container, renderers, questions, document, undefined, buildResources(), {}, QUIZ_MODE_ID, null);

    expect(container.querySelector('.mode-fallback-warning-screen')).toBeNull();
    expect(container.querySelector('.question-screen')).not.toBeNull();
  });

  test('registra localmente mode_selected (con su mode_id) y match_started al despachar un modo válido', () => {
    const { handleModeSelected, resolveScreenRenderers, QUIZ_MODE_ID } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();
    const analytics = require('../../src/services/analytics');

    handleModeSelected(container, renderers, questions, document, undefined, buildResources(), {}, QUIZ_MODE_ID, null);

    expect(analytics.getEventCount('mode_selected')).toBe(1);
    expect(analytics.getEventCount('match_started')).toBe(1);
    expect(analytics.getEventCount('mode_blocked')).toBe(0);
    expect(analytics.getEventCount('mode_dispatch_mismatch')).toBe(0);
    expect(analytics.getEventDetail('mode_selected')).toEqual({ mode_id: QUIZ_MODE_ID });
    expect(analytics.getEventDetail('match_started')).toEqual({ mode_id: QUIZ_MODE_ID });
  });

  test('registra localmente mode_blocked (con mode_id y causa unknown_mode) cuando el id no existe en el catálogo', () => {
    const { handleModeSelected, resolveScreenRenderers, DISPATCH_BLOCKED_CAUSE_UNKNOWN_MODE } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();
    const analytics = require('../../src/services/analytics');

    handleModeSelected(container, renderers, questions, document, undefined, buildResources(), {}, 'modo-inexistente', null);

    expect(analytics.getEventCount('mode_selected')).toBe(1);
    expect(analytics.getEventCount('mode_blocked')).toBe(1);
    expect(analytics.getEventCount('mode_dispatch_mismatch')).toBe(0);
    expect(analytics.getEventCount('match_started')).toBe(0);
    expect(analytics.getEventDetail('mode_blocked')).toEqual({
      mode_id: 'modo-inexistente',
      cause: DISPATCH_BLOCKED_CAUSE_UNKNOWN_MODE,
    });
  });

  test('registra localmente mode_blocked al pulsar una tarjeta bloqueada del selector', () => {
    const { renderModeSelector, resolveScreenRenderers, resolveModesCatalog } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();
    const analytics = require('../../src/services/analytics');
    const modesCatalog = resolveModesCatalog();

    const blockedSpy = jest
      .spyOn(modesCatalog, 'evaluateModes')
      .mockImplementation((catalog, modes) =>
        modes.map((mode) => ({
          modeId: mode.id,
          available: mode.id === 'quiz',
          cause: mode.id === 'quiz' ? null : modesCatalog.AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES,
        }))
      );

    renderModeSelector(container, renderers, questions, document, undefined, buildResources(), {});

    getByRole(container, 'button', { name: modeSelectorStrings.modes.laberinto.accessibleLabel }).click();

    expect(analytics.getEventCount('mode_blocked')).toBe(1);
    expect(analytics.getEventDetail('mode_blocked')).toEqual({
      mode_id: 'laberinto',
      cause: modesCatalog.AVAILABILITY_CAUSES.INSUFFICIENT_CREATURES,
    });
    expect(container.querySelector('.mode-fallback-warning-screen')).toBeNull();

    blockedSpy.mockRestore();
  });

  describe('un renderer ausente bloquea únicamente ese modo (nunca cae en Quiz, nunca lanza)', () => {
    test.each([
      ['parejas', 'renderParejasScreen'],
      ['lineaDelTiempo', 'renderTimelineScreen'],
      ['sombra', 'renderShadowGuessScreen'],
      ['clasifica', 'renderClassifyScreen'],
      ['ordenaPorTamano', 'renderSizeOrderScreen'],
    ])('modeId "%s" sin su propio renderer (%s) muestra el aviso de fallback y registra mode_blocked, sin iniciar nada', (modeId, exportName) => {
      const { handleModeSelected, resolveScreenRenderers, DISPATCH_BLOCKED_CAUSE_RENDERER_MISSING } = require(MAIN_JS_PATH);
      const fullRenderers = resolveScreenRenderers();
      const renderersWithoutOne = withRendererRemoved(fullRenderers, exportName);
      const questions = require('../../src/data/questionBank').loadQuestionBank();
      const analytics = require('../../src/services/analytics');

      expect(() =>
        handleModeSelected(container, renderersWithoutOne, questions, document, undefined, buildResources(), {}, modeId, null)
      ).not.toThrow();

      expect(container.querySelector('.mode-fallback-warning-screen')).not.toBeNull();
      expect(container.querySelector('.question-screen')).toBeNull();
      expect(analytics.getEventCount('mode_blocked')).toBe(1);
      expect(analytics.getEventCount('match_started')).toBe(0);
      expect(analytics.getEventDetail('mode_blocked')).toEqual({
        mode_id: modeId,
        cause: DISPATCH_BLOCKED_CAUSE_RENDERER_MISSING,
      });
    });

    test('quitar el renderer de un modo no afecta a los demás: quiz sigue arrancando con normalidad', () => {
      const { handleModeSelected, resolveScreenRenderers, QUIZ_MODE_ID } = require(MAIN_JS_PATH);
      const fullRenderers = resolveScreenRenderers();
      const renderersWithoutParejas = withRendererRemoved(fullRenderers, 'renderParejasScreen');
      const questions = require('../../src/data/questionBank').loadQuestionBank();

      handleModeSelected(container, renderersWithoutParejas, questions, document, undefined, buildResources(), {}, QUIZ_MODE_ID, null);

      expect(container.querySelector('.mode-fallback-warning-screen')).toBeNull();
      expect(container.querySelector('.question-screen')).not.toBeNull();
    });
  });

  describe('una discrepancia entre el id seleccionado y el destino resuelto siempre bloquea el arranque', () => {
    test('registra mode_dispatch_mismatch (con ambos ids) y muestra el aviso, sin iniciar match_started', () => {
      const { handleModeSelected, buildModeDispatchRegistry, resolveScreenRenderers, QUIZ_MODE_ID, PAREJAS_MODE_ID } = require(
        MAIN_JS_PATH
      );
      const renderers = resolveScreenRenderers();
      const questions = require('../../src/data/questionBank').loadQuestionBank();
      const analytics = require('../../src/services/analytics');

      // A real registry, built the same way production dispatch builds it --
      // then a single entry is corrupted so its own reported modeId disagrees
      // with the key `quiz` is looked up under, forcing the exact "destino
      // resuelto no corresponde al id seleccionado" scenario. Every other
      // entry (including the real `parejas` one) is untouched.
      const registry = buildModeDispatchRegistry(container, renderers, questions, document, undefined, {});
      registry[QUIZ_MODE_ID] = Object.assign({}, registry[QUIZ_MODE_ID], { modeId: PAREJAS_MODE_ID });

      handleModeSelected(
        container,
        renderers,
        questions,
        document,
        undefined,
        buildResources(),
        {},
        QUIZ_MODE_ID,
        null,
        registry
      );

      expect(container.querySelector('.mode-fallback-warning-screen')).not.toBeNull();
      expect(container.querySelector('.question-screen')).toBeNull();
      expect(container.querySelector('.parejas-screen')).toBeNull();
      expect(analytics.getEventCount('mode_dispatch_mismatch')).toBe(1);
      expect(analytics.getEventCount('mode_blocked')).toBe(0);
      expect(analytics.getEventCount('match_started')).toBe(0);
      expect(analytics.getEventDetail('mode_dispatch_mismatch')).toEqual({
        mode_id: QUIZ_MODE_ID,
        resolved_mode_id: PAREJAS_MODE_ID,
      });
    });
  });
});
