const { GameSessionStorage } = require('./storage/GameSessionStorage');
const { startGame, evaluateAnswer, advanceRound, ROUNDS_PER_GAME } = require('../game/roundContract');

function createFakeAdapter() {
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
  };
}

function playingSession(context) {
  return startGame({ generateRound: (roundIndex) => ({ prompt: `round-${roundIndex}` }), context: context || { level: 1 } });
}

function finishedSession() {
  let session = playingSession();
  for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
    session = evaluateAnswer(session, { isCorrect: true }).session;
    session = advanceRound(session).session;
  }
  return session;
}

function loadFacadeWithFakeStorage() {
  const adapter = createFakeAdapter();
  const storage = new GameSessionStorage([adapter]);

  jest.resetModules();
  jest.doMock('./storage', () => ({ gameSessionStorage: storage }));
  const facade = require('./gameSessionStorage');

  return { facade, storage, adapter };
}

describe('gameSessionStorage service (TRIOFSND-238)', () => {
  afterEach(() => {
    jest.dontMock('./storage');
    jest.resetModules();
  });

  describe('hasIncompleteGame', () => {
    it('is false when nothing was ever saved', async () => {
      const { facade } = loadFacadeWithFakeStorage();
      expect(await facade.hasIncompleteGame('quiz')).toBe(false);
    });

    it('is true when the saved round for that mode is still playing/paused', async () => {
      const { facade, storage } = loadFacadeWithFakeStorage();
      await storage.saveSession('quiz', playingSession());

      expect(await facade.hasIncompleteGame('quiz')).toBe(true);
    });

    it('is false for a mode other than the one with the saved round, and never discards it', async () => {
      const { facade, storage } = loadFacadeWithFakeStorage();
      await storage.saveSession('quiz', playingSession());

      expect(await facade.hasIncompleteGame('laberinto')).toBe(false);
      expect(await facade.hasIncompleteGame('quiz')).toBe(true);
    });

    it('is false once the round for that mode has finished', async () => {
      const { facade, storage } = loadFacadeWithFakeStorage();
      await storage.saveSession('quiz', finishedSession());

      expect(await facade.hasIncompleteGame('quiz')).toBe(false);
    });
  });

  describe('discardTransientState', () => {
    it('clears the in-progress round for that mode', async () => {
      const { facade, storage } = loadFacadeWithFakeStorage();
      await storage.saveSession('quiz', playingSession());

      await facade.discardTransientState('quiz');

      expect(await facade.hasIncompleteGame('quiz')).toBe(false);
      expect(await storage.restoreSession('quiz')).toBeNull();
    });

    it('never discards a different mode\'s in-progress round', async () => {
      const { facade, storage } = loadFacadeWithFakeStorage();
      await storage.saveSession('laberinto', playingSession());

      await facade.discardTransientState('quiz');

      expect(await facade.hasIncompleteGame('laberinto')).toBe(true);
    });

    it('never touches durable per-mode keys (bestScore, maxUnlockedLevel, ...)', async () => {
      const { facade, storage, adapter } = loadFacadeWithFakeStorage();
      await storage.saveSession('quiz', playingSession());
      await adapter.setItem('dinoquiz:bestScore', JSON.stringify(10));
      await adapter.setItem('dinoquiz:maxUnlockedLevel', JSON.stringify(3));

      await facade.discardTransientState('quiz');

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem('dinoquiz:bestScore')).toBe('10');
      expect(await adapter.getItem('dinoquiz:maxUnlockedLevel')).toBe('3');
    });

    it('is a no-op when nothing is stored', async () => {
      const { facade } = loadFacadeWithFakeStorage();
      await expect(facade.discardTransientState('quiz')).resolves.toBeUndefined();
    });
  });
});
