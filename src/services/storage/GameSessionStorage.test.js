const { GameSessionStorage, SESSION_SCHEMA_VERSION, SESSION_STORAGE_KEY } = require('./GameSessionStorage');
const { startGame, evaluateAnswer, advanceRound, ROUNDS_PER_GAME } = require('../../game/roundContract');

function createFakeAdapter(overrides = {}) {
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
    ...overrides,
  };
}

function buildGenerateRound() {
  return (roundIndex) => ({ prompt: `round-${roundIndex}` });
}

function playingSession(context) {
  return startGame({ generateRound: buildGenerateRound(), context: context || { level: 1 } });
}

function finishedSession() {
  let session = playingSession();
  for (let i = 0; i < ROUNDS_PER_GAME; i += 1) {
    session = evaluateAnswer(session, { isCorrect: true }).session;
    session = advanceRound(session).session;
  }
  return session;
}

describe('GameSessionStorage', () => {
  describe('saveSession/restoreSession', () => {
    it('returns null when nothing was ever saved', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      expect(await storage.restoreSession('quiz')).toBeNull();
    });

    it('round-trips a playing session, restoring roundIndex/round/state/status', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      const session = playingSession({ level: 2 });

      const persisted = await storage.saveSession('quiz', session);
      expect(persisted).toBe(true);

      const restored = await storage.restoreSession('quiz');
      expect(restored).toMatchObject({
        roundCount: ROUNDS_PER_GAME,
        roundIndex: 0,
        status: 'playing',
        context: { level: 2 },
      });
      expect(restored.round).toMatchObject({ prompt: 'round-0', roundIndex: 0, answered: false });
      expect(restored.state).toEqual({ score: 0, questionIndex: 0, answers: [] });
    });

    it('round-trips progress made mid-game (answered round, non-zero score)', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      let session = playingSession();
      session = evaluateAnswer(session, { isCorrect: true }).session;

      await storage.saveSession('quiz', session);
      const restored = await storage.restoreSession('quiz');

      expect(restored.state.score).toBe(1);
      expect(restored.state.answers).toHaveLength(1);
      expect(restored.round.answered).toBe(true);
    });

    it('does not restore a session saved for a different mode', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await storage.saveSession('quiz', playingSession());

      expect(await storage.restoreSession('laberinto')).toBeNull();
    });

    it('rejects a modeId/session that are not real roundContract sessions, without writing anything', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);

      expect(await storage.saveSession('', playingSession())).toBe(false);
      expect(await storage.saveSession('quiz', null)).toBe(false);
      expect(await storage.saveSession('quiz', {})).toBe(false);
      expect(await storage.restoreSession('quiz')).toBeNull();
    });
  });

  describe('version and integrity validation', () => {
    it('discards and returns null for a stored envelope with a mismatched schema version', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      const raw = await adapter.getItem(SESSION_STORAGE_KEY);
      const envelope = JSON.parse(raw);
      envelope.schemaVersion = SESSION_SCHEMA_VERSION + 1;
      await adapter.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('discards and returns null for corrupted JSON', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await adapter.setItem(SESSION_STORAGE_KEY, '{not-json');

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('discards and returns null for a structurally invalid envelope (out-of-range roundIndex)', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      const envelope = JSON.parse(await adapter.getItem(SESSION_STORAGE_KEY));
      envelope.session.roundIndex = 999;
      await adapter.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('discards and returns null when session.roundIndex and session.round.roundIndex disagree', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      const envelope = JSON.parse(await adapter.getItem(SESSION_STORAGE_KEY));
      envelope.session.roundIndex = 0;
      envelope.session.round.roundIndex = 9;
      await adapter.setItem(SESSION_STORAGE_KEY, JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('discards a finished session instead of restoring it, without touching other persisted keys', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', finishedSession());
      await adapter.setItem('dinoquiz:bestScore', JSON.stringify(10));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(await adapter.getItem('dinoquiz:bestScore')).toBe('10');
    });
  });

  describe('discardSession', () => {
    it('clears the stored session when switching to a different mode', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      await storage.discardSession('laberinto');

      expect(await storage.restoreSession('quiz')).toBeNull();
    });

    it('keeps the stored session when re-entering the same mode', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await storage.saveSession('quiz', playingSession());

      await storage.discardSession('quiz');

      expect(await storage.restoreSession('quiz')).not.toBeNull();
    });

    it('unconditionally clears the stored session when called without a mode', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await storage.saveSession('quiz', playingSession());

      await storage.discardSession();

      expect(await storage.restoreSession('quiz')).toBeNull();
    });

    it('is a no-op when nothing is stored', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await expect(storage.discardSession('quiz')).resolves.toBeUndefined();
    });
  });

  describe('hasIncompleteSession', () => {
    it('is false when nothing was ever saved', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      expect(await storage.hasIncompleteSession('quiz')).toBe(false);
    });

    it('is true for a playing/paused session belonging to that mode', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await storage.saveSession('quiz', playingSession());

      expect(await storage.hasIncompleteSession('quiz')).toBe(true);
    });

    it('is false, and leaves the session untouched, when checked against a different mode', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      expect(await storage.hasIncompleteSession('laberinto')).toBe(false);
      expect(await adapter.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
      expect(await storage.hasIncompleteSession('quiz')).toBe(true);
    });

    it('is false once the session has finished', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await storage.saveSession('quiz', finishedSession());

      expect(await storage.hasIncompleteSession('quiz')).toBe(false);
    });
  });

  describe('discardModeSession', () => {
    it('clears the stored session when it belongs to that mode', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await storage.saveSession('quiz', playingSession());

      await storage.discardModeSession('quiz');

      expect(await storage.restoreSession('quiz')).toBeNull();
    });

    it('leaves a different mode\'s session untouched', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await storage.saveSession('laberinto', playingSession());

      await storage.discardModeSession('quiz');

      expect(await storage.restoreSession('laberinto')).not.toBeNull();
    });

    it('is a no-op when nothing is stored', async () => {
      const storage = new GameSessionStorage([createFakeAdapter()]);
      await expect(storage.discardModeSession('quiz')).resolves.toBeUndefined();
    });
  });

  describe('backend fallback', () => {
    it('falls back to the next adapter when the first one is unavailable', async () => {
      const unavailable = createFakeAdapter({
        async isAvailable() {
          return false;
        },
      });
      const fallback = createFakeAdapter();
      const storage = new GameSessionStorage([unavailable, fallback]);

      await storage.saveSession('quiz', playingSession());

      expect(await storage.restoreSession('quiz')).not.toBeNull();
      expect(storage.getDiagnostics().backend).toBe('memory');
    });

    it('degrades to in-memory and reports set() as non-durable when every adapter throws', async () => {
      const broken = createFakeAdapter({
        async isAvailable() {
          throw new Error('boom');
        },
      });
      const storage = new GameSessionStorage([broken]);

      const persisted = await storage.saveSession('quiz', playingSession());

      expect(persisted).toBe(false);
      const diagnostics = storage.getDiagnostics();
      expect(diagnostics.isPersistent).toBe(false);
      expect(diagnostics.failureCount).toBeGreaterThan(0);
    });
  });
});
