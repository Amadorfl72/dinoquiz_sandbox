'use strict';

/**
 * TRIOFSND-322: generic mode dispatcher coverage for public/scripts/main.js's
 * `handleModeSelected`/`startMode`, refactored from an if/else chain into an
 * explicit mode->renderer registry (`buildModeDispatchRegistry`, built from
 * `resolveScreenRenderers()`). A `modeId` with no entry in that registry --
 * never reachable by tapping a real mode selector card, but reachable if a
 * future catalog id ships its selector card before its dispatch branch, or
 * if a renderer script fails to load -- must show the accessible fallback
 * warning screen (modeFallbackWarningScreen.js) with a way back to the
 * selector, instead of ever silently starting Quiz for a mode nobody chose.
 *
 * Also covers the four local, aggregated analytics events
 * src/services/analytics.js records for the dispatcher: `mode_selected`
 * (every tap that reaches `startMode`), `match_started` (every mode that
 * actually starts), `mode_blocked` (a blocked selector card tapped anyway)
 * and `mode_dispatch_mismatch` (the fallback case above).
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

  test('registra localmente mode_selected y match_started al despachar un modo válido', () => {
    const { handleModeSelected, resolveScreenRenderers, QUIZ_MODE_ID } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();
    const analytics = require('../../src/services/analytics');

    handleModeSelected(container, renderers, questions, document, undefined, buildResources(), {}, QUIZ_MODE_ID, null);

    expect(analytics.getEventCount('mode_selected')).toBe(1);
    expect(analytics.getEventCount('match_started')).toBe(1);
    expect(analytics.getEventCount('mode_dispatch_mismatch')).toBe(0);
  });

  test('registra localmente mode_dispatch_mismatch (y no match_started) cuando no hay renderer registrado', () => {
    const { handleModeSelected, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();
    const analytics = require('../../src/services/analytics');

    handleModeSelected(container, renderers, questions, document, undefined, buildResources(), {}, 'modo-inexistente', null);

    expect(analytics.getEventCount('mode_selected')).toBe(1);
    expect(analytics.getEventCount('mode_dispatch_mismatch')).toBe(1);
    expect(analytics.getEventCount('match_started')).toBe(0);
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
    expect(container.querySelector('.mode-fallback-warning-screen')).toBeNull();

    blockedSpy.mockRestore();
  });
});
