'use strict';

/**
 * TRIOFSND-253: end-to-end coverage for wiring the app shell (main.js) to
 * per-mode progression on game completion -- finishing a 10-round level
 * reads/writes progress via modeProgressStorage.js (TRIOFSND-250), resolves
 * the outcome via gameFlow.js's own per-mode unlock thresholds (TRIOFSND-248/
 * 249), and the resulting score/percentage/stars/level-progress reach
 * resultsScreen.js (TRIOFSND-252) unchanged.
 *
 * Two properties specifically covered here, independent of the richer
 * TRIOFSND-207 level-chaining suite in game-flow.test.js (which exercises
 * this same orchestrator against the quiz mode with isolated, in-memory
 * storage doubles):
 *   - A mode's own level 1 is available on a device that has never played it
 *     (ModeProgressStorage's own default, PRD "Progresión independiente por
 *     modo") -- and playing/unlocking one mode never touches another's.
 *   - An offline reload (a fresh module graph, sharing only the real,
 *     persistent localStorage backend jsdom provides -- same "round-trip
 *     through storage" pattern offline-maze-game.test.js's own
 *     TRIOFSND-259 suite already uses for resolveLogger) restores exactly
 *     the same persisted per-mode state: highest unlocked level and latest
 *     score/percentage/stars result.
 */

const path = require('path');

require('@testing-library/jest-dom');
const { getByRole } = require('@testing-library/dom');

const MAIN_JS_PATH = path.resolve(__dirname, '../../public/scripts/main.js');
const { question: questionStrings } = require('../../public/i18n/es.json');

function goOffline() {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
}

// `level` defaults to 1, mirroring game-flow.test.js's own buildQuestion --
// every level built here is a single, always-valid 10-question pool.
function buildQuestion(id, level) {
  return {
    id,
    dinosaur: 'trex',
    question: `Pregunta ${id}`,
    options: ['A', 'B', 'C'],
    correctAnswerIndex: 0,
    funFact: `Dato curioso ${id}`,
    image: 'dinosaurs/trex.png',
    level: level || 1,
  };
}

function buildQuestionBank(count, level) {
  return Array.from({ length: count }, (_, index) => buildQuestion(`q-${index}`, level));
}

function buildLeveledQuestionBank(levels) {
  return levels.reduce(
    (all, level) =>
      all.concat(
        buildQuestionBank(10, level).map((question, index) => ({
          ...question,
          id: `q-l${level}-${index}`,
        }))
      ),
    []
  );
}

async function answerCurrentQuestion(container, { correct }) {
  const buttons = Array.from(container.querySelectorAll('.question-screen__option'));
  const index = correct ? 0 : 1; // correctAnswerIndex is always 0 in buildQuestion
  buttons[index].click();
  await jest.advanceTimersByTimeAsync(0);
  getByRole(container, 'button', { name: questionStrings.nextButton }).click();
}

async function playLevelWithPattern(container, pattern) {
  for (const mark of pattern.split('')) {
    await answerCurrentQuestion(container, { correct: mark === 'C' });
  }
  await jest.advanceTimersByTimeAsync(0);
}

describe('TRIOFSND-253: wiring del app shell a la progresión por modo (progressStorage + gameFlow + resultsScreen)', () => {
  let container;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    jest.resetModules();
    window.localStorage.clear();
    goOffline();

    // jsdom has no real media playback; stub it out like the sibling suites.
    window.Audio = function FakeAudio() {
      return { play: () => Promise.resolve(), preload: '', currentTime: 0 };
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    container.remove();
  });

  test('el nivel 1 de un modo está disponible antes de haber jugado ninguna partida, independiente de los demás modos', async () => {
    const { resolveModeProgressStorage } = require(MAIN_JS_PATH);
    const modeProgressStorage = resolveModeProgressStorage();

    expect(await modeProgressStorage.getMaxUnlockedLevel('sombra')).toBe(1);
    expect(await modeProgressStorage.getMaxUnlockedLevel('parejas')).toBe(1);
    expect(await modeProgressStorage.getLastResult('sombra')).toBeNull();
  });

  test('finishLevel resuelve el desenlace vía gameFlow.js y persiste el progreso de "sombra" vía modeProgressStorage.js, sin tocar el de "quiz"', async () => {
    const { resolveScreenRenderers, startLevelGame, resolveModeProgressStorage } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildLeveledQuestionBank([1, 2]);
    const modeProgressStorage = resolveModeProgressStorage();

    startLevelGame(container, renderers, questions, document, undefined, {
      ageBand: 'eight-plus',
      modeId: 'sombra',
      randomFn: () => 0,
      modeProgressStorage,
    });

    // 6/10 is exactly the level-up threshold every mode shares today
    // (unlockThresholds.js's DEFAULT_UNLOCK_THRESHOLD).
    await playLevelWithPattern(container, 'CCCCCCFFFF');

    expect(container.querySelector('.results-screen__max-level-unlocked')).toHaveTextContent('2');
    expect(container.textContent).toContain('60'); // percentage, passed through to resultsScreen
    expect(container.querySelector('.results-screen__stars')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('2')
    );

    expect(await modeProgressStorage.getMaxUnlockedLevel('sombra')).toBe(2);
    expect(await modeProgressStorage.getLastResult('sombra')).toEqual({
      score: 6,
      maxScore: 10,
      percentage: 60,
      stars: 2,
      level: 1,
    });

    // Independence (PRD "Progresión independiente por modo"): quiz's own
    // progress is untouched by sombra's game just played.
    expect(await modeProgressStorage.getMaxUnlockedLevel('quiz')).toBe(1);
    expect(await modeProgressStorage.getLastResult('quiz')).toBeNull();
  });

  test('una recarga sin conexión restaura el mismo progreso por modo persistido (nivel máximo desbloqueado y último resultado)', async () => {
    const { resolveScreenRenderers, startLevelGame, resolveModeProgressStorage } = require(MAIN_JS_PATH);
    const renderers = resolveScreenRenderers();
    const questions = buildLeveledQuestionBank([1, 2]);
    const modeProgressStorage = resolveModeProgressStorage();

    startLevelGame(container, renderers, questions, document, undefined, {
      ageBand: 'eight-plus',
      modeId: 'sombra',
      randomFn: () => 0,
      modeProgressStorage,
    });

    await playLevelWithPattern(container, 'CCCCCCFFFF');
    expect(await modeProgressStorage.getMaxUnlockedLevel('sombra')).toBe(2);

    // Simulate an offline reload: a brand-new module graph (so a brand-new
    // ModeProgressStorage instance, never the same JS object as `modeProgressStorage`
    // above), sharing only the real localStorage backend jsdom provides --
    // the same "round-trip through storage" pattern offline-maze-game.test.js's
    // TRIOFSND-259 suite already uses for resolveLogger.
    jest.resetModules();
    goOffline();
    const reloaded = require(MAIN_JS_PATH);
    const reloadedModeProgressStorage = reloaded.resolveModeProgressStorage();

    expect(reloadedModeProgressStorage).not.toBe(modeProgressStorage);
    expect(await reloadedModeProgressStorage.getMaxUnlockedLevel('sombra')).toBe(2);
    expect(await reloadedModeProgressStorage.getLastResult('sombra')).toEqual({
      score: 6,
      maxScore: 10,
      percentage: 60,
      stars: 2,
      level: 1,
    });
    // Untouched sibling mode also restores its (untouched) default state.
    expect(await reloadedModeProgressStorage.getMaxUnlockedLevel('quiz')).toBe(1);

    expect(window.navigator.onLine).toBe(false);
  });
});
