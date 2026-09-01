'use strict';

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

/**
 * TRIOFSND-299: covers "restaurar ronda en curso al recargar con validación
 * de integridad" end to end for the two modes currently driven by
 * roundContract.js (Oído Jurásico, Ordena por tamaño -- see main.js's own
 * doc comment on `restoreLastGameSession`): a session saved mid-game
 * (`gameSessionStorage.saveSession`) is validated with stateSchema.js
 * (`gameSessionStorage.restoreGameState`) and resumed at the exact
 * mode/level/round/score it was on, never re-counting the rounds already
 * answered; an incompatible/finished session only ever resets the transient
 * game, never the durable per-mode results.
 */

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const OIDO_SCREEN_PATH = path.resolve(__dirname, '../../public/scripts/oidoJurasicoScreen.js');
const i18n = require('../../public/i18n/es.json');
const { oidoJurasico: oidoStrings } = i18n;

function rejectingFetch() {
  return jest.fn(() => Promise.reject(new Error('network unreachable: device is offline')));
}

/** Flushes the real (non-fake) microtask queue so a fire-and-forget discard (persistRoundContractSession/discardRoundContractSession in main.js) settles before an assertion reads the same storage. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Precomputes every round's correct creature via the same randomFn the live game will consume -- round generation is deterministic. */
function precomputeCorrectIds(randomFn) {
  const oido = require(OIDO_SCREEN_PATH);
  const context = oido.buildOidoJurasicoRoundContext({ randomFn });
  const correctIds = [];
  for (let i = 0; i < oido.ROUNDS_PER_GAME; i += 1) {
    const round = oido.generateOidoJurasicoRound(i, context);
    correctIds.push(round.correctId);
  }
  return correctIds;
}

function clickCorrectOidoOption(container, correctId) {
  const buttons = Array.from(container.querySelectorAll('.oido-jurasico-screen__option'));
  const strings = oidoStrings.dinosaurNames;
  const target = buttons.find((button) => button.textContent === strings[correctId]);
  expect(target).toBeTruthy();
  target.click();
}

/** Confirms a size-order round without swapping (always "incorrecto") and taps "Siguiente". */
function playSizeOrderRoundIncorrectly(container) {
  container.querySelector('.size-order-screen__confirm-button').click();
  const nextButton = container.querySelector('.size-order-screen__next-button');
  expect(nextButton.hidden).toBe(false);
  nextButton.click();
}

describe('TRIOFSND-299: restaurar ronda en curso al recargar (Oído Jurásico)', () => {
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
  });

  afterEach(() => {
    container.remove();
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  });

  test('resumes at the saved round/score via ctx.restoredSession, without duplicating the already-counted round', async () => {
    global.fetch = rejectingFetch();

    const { startOidoJurasicoGame, resolveScreenRenderers, resolveRoundContract, resolveOidoJurasicoGame, OIDO_JURASICO_MODE_ID } =
      require(MAIN_JS_PATH);
    const gameSessionStorage = require('../../src/services/gameSessionStorage');
    const renderers = resolveScreenRenderers();
    const roundContractApi = resolveRoundContract();
    const oidoJurasicoGame = resolveOidoJurasicoGame();
    const randomFn = () => 0.5;
    const correctIds = precomputeCorrectIds(randomFn);

    // Plays round 0 correctly and advances to round 1 directly through
    // roundContract.js -- exactly what playOidoJurasicoRound's onAnswer/
    // onNext do -- then persists that session, mirroring what a mid-game
    // reload would have already saved via persistRoundContractSession.
    const context = oidoJurasicoGame.buildOidoJurasicoRoundContext({ randomFn });
    let session = roundContractApi.startGame({ generateRound: oidoJurasicoGame.generateOidoJurasicoRound, context });
    session = roundContractApi.evaluateAnswer(session, { isCorrect: true, selectedId: correctIds[0], correctId: correctIds[0] }).session;
    session = roundContractApi.advanceRound(session).session;

    await gameSessionStorage.saveSession(OIDO_JURASICO_MODE_ID, session);
    const restored = await gameSessionStorage.restoreGameState(OIDO_JURASICO_MODE_ID);
    expect(restored).toMatchObject({ modeId: OIDO_JURASICO_MODE_ID, currentRound: 1, score: 1, answeredCount: 1 });

    startOidoJurasicoGame(container, renderers, document, undefined, { randomFn, restoredSession: restored });

    // Resumed straight into round 2 (roundIndex 1) with the score already
    // counted -- round 0's answer/point is not replayed or re-added.
    expect(container.textContent).toContain(oidoStrings.scoreLabel + ': 1');
    expect(container.textContent).toContain('Ronda 2 de 10');

    // Playing the remaining 9 rounds correctly reaches exactly 10/10 -- if
    // round 0 had been duplicated the final score would overshoot this.
    for (let i = 1; i < correctIds.length; i += 1) {
      clickCorrectOidoOption(container, correctIds[i]);
      container.querySelector('.oido-jurasico-screen__next-button').click();
    }

    expect(container.textContent).toContain('10/10');
  });

  test('a fresh startOidoJurasicoGame call ignores a stale window.DinoQuiz.restoredGameState for a different mode', () => {
    global.fetch = rejectingFetch();
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.restoredGameState = { modeId: 'ordenaPorTamano', session: {} };

    const { startOidoJurasicoGame, resolveScreenRenderers } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();

    startOidoJurasicoGame(container, renderers, document, undefined, { randomFn: () => 0.5 });

    expect(container.textContent).toContain(oidoStrings.scoreLabel + ': 0');
    expect(container.textContent).toContain('Ronda 1 de 10');
    // Untouched: it belongs to a different mode.
    expect(window.DinoQuiz.restoredGameState).toEqual({ modeId: 'ordenaPorTamano', session: {} });
  });

  test('finishing a game discards its transient session, leaving nothing to restore', async () => {
    global.fetch = rejectingFetch();

    const { startOidoJurasicoGame, resolveScreenRenderers, OIDO_JURASICO_MODE_ID } = require(MAIN_JS_PATH);
    const gameSessionStorage = require('../../src/services/gameSessionStorage');
    const renderers = resolveScreenRenderers();
    const randomFn = () => 0.5;
    const correctIds = precomputeCorrectIds(randomFn);

    startOidoJurasicoGame(container, renderers, document, undefined, { randomFn });

    correctIds.forEach((correctId) => {
      clickCorrectOidoOption(container, correctId);
      container.querySelector('.oido-jurasico-screen__next-button').click();
    });

    expect(container.textContent).toContain('10/10');
    await flush();
    expect(await gameSessionStorage.restoreGameState(OIDO_JURASICO_MODE_ID)).toBeNull();
  });

  test('restoreLastGameSession resolves to null (never throws) when there is no last mode or nothing saved', async () => {
    const { restoreLastGameSession } = require(MAIN_JS_PATH);

    const restored = await restoreLastGameSession(window);

    expect(restored).toBeNull();
    expect(window.DinoQuiz.restoredGameState).toBeNull();
  });
});

describe('TRIOFSND-299: restaurar ronda en curso al recargar (Ordena por tamaño)', () => {
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
  });

  afterEach(() => {
    container.remove();
    if (hadOwnFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  });

  test('resumes at the saved round/score via ctx.restoredSession, without duplicating the already-counted round', async () => {
    global.fetch = rejectingFetch();

    const { startSizeOrderGame, resolveScreenRenderers, resolveRoundContract, resolveSizeOrderGame, SIZE_ORDER_MODE_ID } =
      require(MAIN_JS_PATH);
    const gameSessionStorage = require('../../src/services/gameSessionStorage');
    const renderers = resolveScreenRenderers();
    const roundContractApi = resolveRoundContract();
    const sizeOrderGame = resolveSizeOrderGame();
    const randomFn = () => 0.5;

    const context = sizeOrderGame.buildSizeOrderRoundContext({ randomFn });
    let session = roundContractApi.startGame({ generateRound: sizeOrderGame.generateSizeOrderRoundForContract, context });
    session = roundContractApi.evaluateAnswer(session, { isCorrect: true, order: [], correctOrder: [] }).session;
    session = roundContractApi.advanceRound(session).session;

    await gameSessionStorage.saveSession(SIZE_ORDER_MODE_ID, session);
    const restored = await gameSessionStorage.restoreGameState(SIZE_ORDER_MODE_ID);
    expect(restored).toMatchObject({ modeId: SIZE_ORDER_MODE_ID, currentRound: 1, score: 1, answeredCount: 1 });

    startSizeOrderGame(container, renderers, document, undefined, { randomFn, restoredSession: restored });

    expect(container.querySelector('.size-order-screen')).not.toBeNull();

    // Playing the remaining 9 rounds "incorrecto" (always exactly one swap
    // away from correct, see offline-size-order-game.test.js) reaches 1/10 --
    // if round 0's point had been duplicated or dropped this would differ.
    for (let i = 1; i < 10; i += 1) {
      playSizeOrderRoundIncorrectly(container);
    }

    expect(container.textContent).toContain('1/10');
  });

  test('finishing a game discards its transient session, leaving nothing to restore', async () => {
    global.fetch = rejectingFetch();

    const { startSizeOrderGame, resolveScreenRenderers, SIZE_ORDER_MODE_ID } = require(MAIN_JS_PATH);
    const gameSessionStorage = require('../../src/services/gameSessionStorage');
    const renderers = resolveScreenRenderers();

    startSizeOrderGame(container, renderers, document, undefined, { randomFn: () => 0.5 });
    for (let i = 0; i < 10; i += 1) {
      playSizeOrderRoundIncorrectly(container);
    }

    expect(getByRole(container, 'heading', { name: i18n.results.heading })).toBeInTheDocument();
    await flush();
    expect(await gameSessionStorage.restoreGameState(SIZE_ORDER_MODE_ID)).toBeNull();
  });

  test('startSizeOrderGame resumes from window.DinoQuiz.restoredGameState (Al arrancar) when ctx has no explicit override', async () => {
    global.fetch = rejectingFetch();

    const { startSizeOrderGame, resolveScreenRenderers, resolveRoundContract, resolveSizeOrderGame, SIZE_ORDER_MODE_ID } =
      require(MAIN_JS_PATH);
    const gameSessionStorage = require('../../src/services/gameSessionStorage');
    const renderers = resolveScreenRenderers();
    const roundContractApi = resolveRoundContract();
    const sizeOrderGame = resolveSizeOrderGame();
    const randomFn = () => 0.5;

    const context = sizeOrderGame.buildSizeOrderRoundContext({ randomFn });
    let session = roundContractApi.startGame({ generateRound: sizeOrderGame.generateSizeOrderRoundForContract, context });
    session = roundContractApi.advanceRound(
      roundContractApi.evaluateAnswer(session, { isCorrect: true, order: [], correctOrder: [] }).session
    ).session;
    await gameSessionStorage.saveSession(SIZE_ORDER_MODE_ID, session);

    // Stands in for what restoreLastGameSession stashes during
    // bootstrapBrowserApp's boot sequence (see the generic "restoreLastGameSession"
    // coverage below) -- exercised here directly against the real window
    // global consumeRestoredSession reads when ctx.restoredSession is unset.
    window.DinoQuiz = window.DinoQuiz || {};
    window.DinoQuiz.restoredGameState = await gameSessionStorage.restoreGameState(SIZE_ORDER_MODE_ID);

    startSizeOrderGame(container, renderers, document, undefined, {});

    expect(container.querySelector('.size-order-screen')).not.toBeNull();
    // Consumed exactly once -- a later replay never re-resumes it.
    expect(window.DinoQuiz.restoredGameState).toBeNull();

    // Playing the remaining 9 rounds "incorrecto" reaches exactly 1/10 --
    // round 0's already-counted point was neither dropped nor duplicated.
    for (let i = 1; i < 10; i += 1) {
      playSizeOrderRoundIncorrectly(container);
    }
    expect(container.textContent).toContain('1/10');
  });
});

describe('TRIOFSND-299: restoreLastGameSession (Al arrancar, generic boot wiring)', () => {
  beforeEach(() => {
    jest.resetModules();
    delete window.DinoQuiz;
    window.localStorage.clear();
  });

  test('reads dinoquiz:lastMode, validates the saved session with stateSchema.js and stashes it on window.DinoQuiz.restoredGameState', async () => {
    const { restoreLastGameSession } = require(MAIN_JS_PATH);
    const gameSessionStorage = require('../../src/services/gameSessionStorage');
    const modeStorage = require('../../src/services/modeStorage');
    const { startGame, evaluateAnswer, advanceRound } = require('../../src/game/roundContract');

    // 'quiz' is always available (no per-mode resource requirement), so
    // modeStorage.getLastMode's own registry/availability check -- deliberately
    // stricter than roundContract.js's session validity -- never gets in the
    // way of exercising restoreLastGameSession's own plumbing here.
    modeStorage.setLastMode('quiz');

    let session = startGame({ generateRound: (roundIndex) => ({ prompt: `round-${roundIndex}` }), context: { level: 1 } });
    session = advanceRound(evaluateAnswer(session, { isCorrect: true }).session).session;
    await gameSessionStorage.saveSession('quiz', session);

    const restored = await restoreLastGameSession(window);

    expect(restored).toMatchObject({ modeId: 'quiz', level: 1, currentRound: 1, score: 1, answeredCount: 1 });
    expect(window.DinoQuiz.restoredGameState).toBe(restored);
  });

  test('resolves to null (never throws) when there is no last mode or nothing saved', async () => {
    const { restoreLastGameSession } = require(MAIN_JS_PATH);

    const restored = await restoreLastGameSession(window);

    expect(restored).toBeNull();
    expect(window.DinoQuiz.restoredGameState).toBeNull();
  });

  test('resolves to null and discards only the transient state for a saved session that fails stateSchema.js validation', async () => {
    const { restoreLastGameSession } = require(MAIN_JS_PATH);
    const gameSessionStorage = require('../../src/services/gameSessionStorage');
    const modeStorage = require('../../src/services/modeStorage');
    const { startGame } = require('../../src/game/roundContract');

    modeStorage.setLastMode('quiz');
    // A level out of unlockThresholds.js's MIN_LEVEL..MAX_LEVEL fails
    // isValidModeState even though roundContract.js's own envelope shape is fine.
    const session = startGame({ generateRound: (roundIndex) => ({ prompt: `round-${roundIndex}` }), context: { level: 99 } });
    await gameSessionStorage.saveSession('quiz', session);

    const restored = await restoreLastGameSession(window);

    expect(restored).toBeNull();
    expect(window.DinoQuiz.restoredGameState).toBeNull();
    expect(await gameSessionStorage.restoreGameState('quiz')).toBeNull();
  });
});
