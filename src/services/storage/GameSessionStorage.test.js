const {
  GameSessionStorage,
  SESSION_SCHEMA_VERSION,
  sessionKey,
  SESSION_DISCARD_INCOMPATIBLE_CODE,
  SESSION_DISCARD_UNSUPPORTED_VERSION_CODE,
} = require('./GameSessionStorage');
const { startGame, evaluateAnswer, advanceRound, ROUNDS_PER_GAME } = require('../../game/roundContract');

function createFakeLogService() {
  return {
    stateDiscardedCalls: [],
    logStateDiscarded(modeId, code) {
      this.stateDiscardedCalls.push({ modeId, code });
    },
    logEvent() {},
  };
}

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
    it('discards and returns null for a stored envelope with a schema version that has no migration path', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      const raw = await adapter.getItem(sessionKey('quiz'));
      const envelope = JSON.parse(raw);
      envelope.schemaVersion = SESSION_SCHEMA_VERSION + 1;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(sessionKey('quiz'))).toBeNull();
    });

    it('discards and returns null for corrupted JSON', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await adapter.setItem(sessionKey('quiz'), '{not-json');

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(sessionKey('quiz'))).toBeNull();
    });

    it('discards and returns null for a structurally invalid envelope (out-of-range roundIndex)', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.session.roundIndex = 999;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(sessionKey('quiz'))).toBeNull();
    });

    it('discards and returns null when session.roundIndex and session.round.roundIndex disagree', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', playingSession());

      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.session.roundIndex = 0;
      envelope.session.round.roundIndex = 9;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(sessionKey('quiz'))).toBeNull();
    });

    it('discards a finished session instead of restoring it, without touching other persisted keys', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);
      await storage.saveSession('quiz', finishedSession());
      await adapter.setItem('dinoquiz:bestScore', JSON.stringify(10));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(await adapter.getItem(sessionKey('quiz'))).toBeNull();
      expect(await adapter.getItem('dinoquiz:bestScore')).toBe('10');
    });
  });

  describe('schema-version migration (TRIOFSND-300)', () => {
    it('restores a session migrated from an older schema version once it passes integrity validation', async () => {
      const adapter = createFakeAdapter();
      const oldVersion = SESSION_SCHEMA_VERSION - 1;
      const migrations = {
        [oldVersion]: (envelope) => Object.assign({}, envelope, { schemaVersion: SESSION_SCHEMA_VERSION }),
      };
      const storage = new GameSessionStorage([adapter], undefined, migrations);
      await storage.saveSession('quiz', playingSession({ level: 2 }));
      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.schemaVersion = oldVersion;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      const restored = await storage.restoreSession('quiz');

      expect(restored).not.toBeNull();
      expect(restored.context).toEqual({ level: 2 });
    });

    it('chains multiple registered migrations to reach the current schema version', async () => {
      const adapter = createFakeAdapter();
      const veryOldVersion = SESSION_SCHEMA_VERSION - 2;
      const oldVersion = SESSION_SCHEMA_VERSION - 1;
      const migrations = {
        [veryOldVersion]: (envelope) => Object.assign({}, envelope, { schemaVersion: oldVersion }),
        [oldVersion]: (envelope) => Object.assign({}, envelope, { schemaVersion: SESSION_SCHEMA_VERSION }),
      };
      const storage = new GameSessionStorage([adapter], undefined, migrations);
      await storage.saveSession('quiz', playingSession());
      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.schemaVersion = veryOldVersion;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).not.toBeNull();
    });

    it('discards a migrated envelope that still fails integrity validation, with the generic incompatible code, leaving completed results untouched', async () => {
      const adapter = createFakeAdapter();
      const logService = createFakeLogService();
      const oldVersion = SESSION_SCHEMA_VERSION - 1;
      const migrations = {
        [oldVersion]: (envelope) =>
          Object.assign({}, envelope, {
            schemaVersion: SESSION_SCHEMA_VERSION,
            session: Object.assign({}, envelope.session, { roundIndex: 999 }),
          }),
      };
      const storage = new GameSessionStorage([adapter], logService, migrations);
      await storage.saveSession('quiz', playingSession());
      await adapter.setItem('dinoquiz:bestScore', JSON.stringify(42));
      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.schemaVersion = oldVersion;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();

      expect(logService.stateDiscardedCalls).toEqual([{ modeId: 'quiz', code: SESSION_DISCARD_INCOMPATIBLE_CODE }]);
      expect(await adapter.getItem(sessionKey('quiz'))).toBeNull();
      expect(await adapter.getItem('dinoquiz:bestScore')).toBe('42');
    });

    it('discards a schema version with no registered migration path, with the unsupported-version code, leaving completed results untouched', async () => {
      const adapter = createFakeAdapter();
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([adapter], logService, {});
      await storage.saveSession('quiz', playingSession());
      await adapter.setItem('dinoquiz:bestScore', JSON.stringify(7));
      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.schemaVersion = SESSION_SCHEMA_VERSION - 1;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();

      expect(logService.stateDiscardedCalls).toEqual([
        { modeId: 'quiz', code: SESSION_DISCARD_UNSUPPORTED_VERSION_CODE },
      ]);
      expect(await adapter.getItem(sessionKey('quiz'))).toBeNull();
      expect(await adapter.getItem('dinoquiz:bestScore')).toBe('7');
    });

    it('discards, with the unsupported-version code, a version newer than this build understands (downgrade scenario)', async () => {
      const adapter = createFakeAdapter();
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([adapter], logService, {});
      await storage.saveSession('quiz', playingSession());
      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.schemaVersion = SESSION_SCHEMA_VERSION + 1;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();

      expect(logService.stateDiscardedCalls).toEqual([
        { modeId: 'quiz', code: SESSION_DISCARD_UNSUPPORTED_VERSION_CODE },
      ]);
    });
  });

  describe('per-mode session independence (TRIOFSND-298)', () => {
    it('keeps a quiz round resumable after a laberinto round is saved, and vice versa', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);

      await storage.saveSession('quiz', playingSession({ level: 1 }));
      await storage.saveSession('laberinto', playingSession({ level: 3 }));

      const restoredQuiz = await storage.restoreSession('quiz');
      const restoredLaberinto = await storage.restoreSession('laberinto');
      expect(restoredQuiz).not.toBeNull();
      expect(restoredQuiz.context).toEqual({ level: 1 });
      expect(restoredLaberinto).not.toBeNull();
      expect(restoredLaberinto.context).toEqual({ level: 3 });
    });

    it('stores each mode under its own dinoquiz:-namespaced key rather than a single shared key', async () => {
      const adapter = createFakeAdapter();
      const storage = new GameSessionStorage([adapter]);

      await storage.saveSession('quiz', playingSession());
      await storage.saveSession('laberinto', playingSession());

      expect(await adapter.getItem(sessionKey('quiz'))).not.toBeNull();
      expect(await adapter.getItem(sessionKey('laberinto'))).not.toBeNull();
      expect(sessionKey('quiz')).not.toBe(sessionKey('laberinto'));
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
      expect(await adapter.getItem(sessionKey('quiz'))).not.toBeNull();
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

  describe('state-discard diagnostics (TRIOFSND-246)', () => {
    it('logs the stable discard code for the requested modeId when corrupted JSON is discarded', async () => {
      const adapter = createFakeAdapter();
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([adapter], logService);
      await adapter.setItem(sessionKey('quiz'), '{not-json');

      await storage.restoreSession('quiz');

      expect(logService.stateDiscardedCalls).toEqual([{ modeId: 'quiz', code: SESSION_DISCARD_INCOMPATIBLE_CODE }]);
    });

    it('TRIOFSND-318: also records a structured diagnostics.js error for the discard, never the session content', async () => {
      const adapter = createFakeAdapter();
      const diagnosticsService = { recordError: jest.fn() };
      const storage = new GameSessionStorage([adapter], createFakeLogService(), undefined, diagnosticsService);
      await adapter.setItem(sessionKey('quiz'), '{not-json');

      await storage.restoreSession('quiz');

      expect(diagnosticsService.recordError).toHaveBeenCalledWith('quiz', 'state', SESSION_DISCARD_INCOMPATIBLE_CODE);
    });

    it('logs the unsupported-version discard code for a schema version with no migration path', async () => {
      const adapter = createFakeAdapter();
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([adapter], logService);
      await storage.saveSession('quiz', playingSession());
      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.schemaVersion = SESSION_SCHEMA_VERSION + 1;
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      await storage.restoreSession('quiz');

      expect(logService.stateDiscardedCalls).toEqual([
        { modeId: 'quiz', code: SESSION_DISCARD_UNSUPPORTED_VERSION_CODE },
      ]);
    });

    it('does not restore or log anything when a different mode\'s key was never written (per-mode keys, TRIOFSND-298)', async () => {
      const adapter = createFakeAdapter();
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([adapter], logService);
      await storage.saveSession('quiz', playingSession());

      expect(await storage.restoreSession('laberinto')).toBeNull();
      expect(logService.stateDiscardedCalls).toEqual([]);
    });

    it('logs the discard code, tagged with the requested modeId, when an envelope\'s internal modeId disagrees with its own storage key', async () => {
      const adapter = createFakeAdapter();
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([adapter], logService);
      await storage.saveSession('quiz', playingSession());

      const envelope = JSON.parse(await adapter.getItem(sessionKey('quiz')));
      envelope.modeId = 'laberinto';
      await adapter.setItem(sessionKey('quiz'), JSON.stringify(envelope));

      expect(await storage.restoreSession('quiz')).toBeNull();
      expect(logService.stateDiscardedCalls).toEqual([{ modeId: 'quiz', code: SESSION_DISCARD_INCOMPATIBLE_CODE }]);
    });

    it('never logs when nothing was ever saved', async () => {
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([createFakeAdapter()], logService);

      await storage.restoreSession('quiz');

      expect(logService.stateDiscardedCalls).toEqual([]);
    });

    it('never logs a successful restore', async () => {
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([createFakeAdapter()], logService);
      await storage.saveSession('quiz', playingSession());

      await storage.restoreSession('quiz');

      expect(logService.stateDiscardedCalls).toEqual([]);
    });

    it('never logs the deliberate discardModeSession flow (already tracked by logGameAbandonedByMode)', async () => {
      const logService = createFakeLogService();
      const storage = new GameSessionStorage([createFakeAdapter()], logService);
      await storage.saveSession('quiz', playingSession());

      await storage.discardModeSession('quiz');
      await storage.saveSession('laberinto', playingSession());
      await storage.discardModeSession('laberinto');

      expect(logService.stateDiscardedCalls).toEqual([]);
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
