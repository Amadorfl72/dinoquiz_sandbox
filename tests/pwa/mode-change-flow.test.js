'use strict';

/**
 * TRIOFSND-239: end-to-end coverage, network disabled, for "cambiar de modo
 * fuera de una ronda" -- public/scripts/main.js's `handleModeSelected`, the
 * handler behind every mode card tap on the illustrated selector
 * (public/scripts/modeSelectorScreen.js). When the mode the player was last
 * playing (`dinoquiz:lastMode`) still has an incomplete, resumable round
 * saved (src/services/gameSessionStorage.js's `hasIncompleteGame`,
 * TRIOFSND-238) and a *different* mode is tapped, switching would silently
 * lose that progress -- so a confirmation dialog
 * (public/scripts/modeChangeConfirmScreen.js, TRIOFSND-237) is shown first.
 * Covers the three scenarios: no incomplete game (straight through),
 * confirming (discard + tally + back to the selector) and cancelling
 * (nothing discarded, nothing counted).
 */

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const i18n = require('../../public/i18n/es.json');
const { modeSelector: modeSelectorStrings, modeChange: modeChangeStrings, modes: modesStrings } = i18n;

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

function buildResources() {
  return { modeSelector: modeSelectorStrings, modes: modesStrings, modeChange: modeChangeStrings };
}

/** Persists `modeId` as the current in-progress round via the real gameSessionStorage service (TRIOFSND-238), the same shape a future mode's own round screen would save through roundContract.js. */
async function seedIncompleteSession(modeId) {
  const { startGame } = require('../../src/game/roundContract');
  const { gameSessionStorage } = require('../../src/services/storage');
  const session = startGame({ generateRound: (roundIndex) => ({ prompt: 'round-' + roundIndex }) });
  await gameSessionStorage.saveSession(modeId, session);
}

function setLastMode(modeId) {
  require('../../public/scripts/modeStorage').setLastMode(modeId, window.localStorage);
}

/** Flushes the real (non-fake) timer/microtask queue so gameSessionStorage's async reads/writes settle before assertions run. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function clickModeCard(container, modeId) {
  getByRole(container, 'button', { name: modeSelectorStrings.modes[modeId].accessibleLabel }).click();
}

describe('TRIOFSND-239: cambiar de modo fuera de una ronda (red desactivada)', () => {
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

  function renderSelector() {
    const { renderModeSelector, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = require('../../src/data/questionBank').loadQuestionBank();
    renderModeSelector(container, renderers, questions, document, undefined, buildResources(), {});
  }

  test('sin partida incompleta: elegir otro modo entra directo en él, sin diálogo de confirmación', async () => {
    setLastMode('laberinto');
    renderSelector();

    clickModeCard(container, 'quiz');
    await flush();

    expect(container.querySelector('.mode-change-confirm-screen')).toBeNull();
    expect(container.querySelector('.question-screen')).not.toBeNull();
    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('con partida incompleta, al confirmar: descarta la ronda, cuenta el abandono por modo y navega al selector', async () => {
    setLastMode('laberinto');
    await seedIncompleteSession('laberinto');
    renderSelector();

    clickModeCard(container, 'quiz');
    await flush();

    expect(container.querySelector('.mode-change-confirm-screen')).not.toBeNull();
    expect(container.querySelector('.question-screen')).toBeNull();

    getByRole(container, 'button', { name: modeChangeStrings.confirmButtonLabel }).click();
    await flush();

    expect(container.querySelector('.mode-change-confirm-screen')).toBeNull();
    expect(container.querySelector('.question-screen')).toBeNull();
    expect(container.querySelector('.mode-selector-screen')).not.toBeNull();

    const { gameSessionStorage } = require('../../src/services/storage');
    expect(await gameSessionStorage.hasIncompleteSession('laberinto')).toBe(false);

    const { resolveLogger } = require(MAIN_JS_PATH);
    expect(resolveLogger().getGamesAbandonedByMode()).toEqual({ laberinto: 1 });

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('con partida incompleta, al cancelar: la partida actual permanece intacta en la misma ronda y no se cuenta el abandono', async () => {
    setLastMode('laberinto');
    await seedIncompleteSession('laberinto');
    renderSelector();

    clickModeCard(container, 'quiz');
    await flush();

    getByRole(container, 'button', { name: modeChangeStrings.cancelButtonLabel }).click();
    await flush();

    expect(container.querySelector('.mode-change-confirm-screen')).toBeNull();
    expect(container.querySelector('.question-screen')).toBeNull();
    expect(container.querySelector('.mode-selector-screen')).not.toBeNull();

    const { gameSessionStorage } = require('../../src/services/storage');
    expect(await gameSessionStorage.hasIncompleteSession('laberinto')).toBe(true);

    const { resolveLogger } = require(MAIN_JS_PATH);
    expect(resolveLogger().getGamesAbandonedByMode()).toEqual({});

    expect(window.navigator.onLine).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
