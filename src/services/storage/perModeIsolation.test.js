'use strict';

/**
 * Cross-store contract test (TRIOFSND-298, PRD "Progresión independiente por
 * modo"): proves that completed progress (results/desbloqueos,
 * ModeProgressStorage.js) and transient state (ronda en curso,
 * GameSessionStorage.js) live under separate, `dinoquiz:`-namespaced,
 * per-mode keys on the *same* underlying backend, and that neither a mode's
 * progress nor its in-progress round can ever be read back as another
 * mode's. Each store already has its own focused suite
 * (ModeProgressStorage.test.js, GameSessionStorage.test.js); this file
 * exercises them together, sharing one adapter, the way the real app does
 * through `src/services/storage/index.js`'s singletons.
 */

const { ModeProgressStorage, MODE_PROGRESS_KEY_PREFIX } = require('./ModeProgressStorage');
const { GameSessionStorage, SESSION_SCHEMA_VERSION, SESSION_STORAGE_KEY } = require('./GameSessionStorage');
const { MODE_STATE_SCHEMA_VERSION } = require('./types');
const { isValidModeState } = require('./stateSchema');
const { startGame, evaluateAnswer } = require('../../game/roundContract');

const NAMESPACE = 'dinoquiz:';
const MODE_A = 'quiz';
const MODE_B = 'laberinto';

function createSharedAdapter() {
  const store = new Map();
  return {
    name: 'memory',
    async isAvailable() {
      return true;
    },
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
    keys() {
      return [...store.keys()];
    },
  };
}

function playingSession(level) {
  return startGame({ generateRound: (roundIndex) => ({ prompt: `round-${roundIndex}` }), context: { level } });
}

describe('per-mode isolation across ModeProgressStorage and GameSessionStorage (TRIOFSND-298)', () => {
  it('shares the same schema version between the transient envelope and the previous task\'s shared per-mode contract', () => {
    expect(SESSION_SCHEMA_VERSION).toBe(MODE_STATE_SCHEMA_VERSION);
  });

  it('never mixes one mode\'s completed progress with another\'s, on a shared backend', async () => {
    const adapter = createSharedAdapter();
    const progressStorage = new ModeProgressStorage([adapter]);

    await progressStorage.recordLevelUnlocked(MODE_A, 3);
    await progressStorage.recordResult(MODE_A, { score: 8, maxScore: 10, level: 3 });

    expect(await progressStorage.getMaxUnlockedLevel(MODE_B)).toBe(1);
    expect(await progressStorage.getLastResult(MODE_B)).toBeNull();
    expect(await progressStorage.getMaxUnlockedLevel(MODE_A)).toBe(3);
    expect((await progressStorage.getLastResult(MODE_A)).score).toBe(8);

    for (const key of adapter.keys()) {
      expect(key.startsWith(NAMESPACE)).toBe(true);
    }
    expect(adapter.keys()).toEqual(expect.arrayContaining([`${MODE_PROGRESS_KEY_PREFIX}${MODE_A}`]));
    expect(adapter.keys()).not.toContain(`${MODE_PROGRESS_KEY_PREFIX}${MODE_B}`);
  });

  it('never restores one mode\'s transient round as another\'s, on a shared backend', async () => {
    const adapter = createSharedAdapter();
    const sessionStorage = new GameSessionStorage([adapter]);

    await sessionStorage.saveSession(MODE_A, playingSession(2));

    expect(await sessionStorage.hasIncompleteSession(MODE_B)).toBe(false);
    expect(await sessionStorage.hasIncompleteSession(MODE_A)).toBe(true);
    const restoredA = await sessionStorage.restoreSession(MODE_A);
    expect(restoredA).not.toBeNull();
    expect(adapter.keys()).toEqual([SESSION_STORAGE_KEY]);
    expect(SESSION_STORAGE_KEY.startsWith(NAMESPACE)).toBe(true);
  });

  it('keeps completed progress and transient state under distinct keys for the same mode, neither overwriting the other', async () => {
    const adapter = createSharedAdapter();
    const progressStorage = new ModeProgressStorage([adapter]);
    const sessionStorage = new GameSessionStorage([adapter]);

    await progressStorage.recordLevelUnlocked(MODE_A, 2);
    let session = playingSession(2);
    session = evaluateAnswer(session, { isCorrect: true }).session;
    await sessionStorage.saveSession(MODE_A, session);

    expect(await progressStorage.getMaxUnlockedLevel(MODE_A)).toBe(2);
    const restored = await sessionStorage.restoreSession(MODE_A);
    expect(restored.state.answers).toHaveLength(1);

    expect(adapter.keys().sort()).toEqual([`${MODE_PROGRESS_KEY_PREFIX}${MODE_A}`, SESSION_STORAGE_KEY].sort());
  });

  it('a transient snapshot built from a restored session satisfies the shared per-mode PersistedModeState contract (TRIOFSND-297)', async () => {
    const adapter = createSharedAdapter();
    const sessionStorage = new GameSessionStorage([adapter]);

    let session = playingSession(2);
    session = evaluateAnswer(session, { isCorrect: true }).session;
    await sessionStorage.saveSession(MODE_A, session);
    const restored = await sessionStorage.restoreSession(MODE_A);

    const snapshot = {
      schemaVersion: MODE_STATE_SCHEMA_VERSION,
      modeId: MODE_A,
      level: restored.context.level,
      currentRound: restored.roundIndex,
      answeredCount: restored.state.answers.length,
    };

    expect(isValidModeState(snapshot)).toBe(true);
  });
});
