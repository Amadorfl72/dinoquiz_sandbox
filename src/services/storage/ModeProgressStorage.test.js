const {
  ModeProgressStorage,
  MODE_PROGRESS_SCHEMA_VERSION,
  MODE_PROGRESS_KEY_PREFIX,
  MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE,
} = require('./ModeProgressStorage');

function createFakeLogService() {
  return {
    stateDiscardedCalls: [],
    eventCalls: [],
    logStateDiscarded(modeId, code) {
      this.stateDiscardedCalls.push({ modeId, code });
    },
    logEvent(eventType) {
      this.eventCalls.push(eventType);
    },
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

describe('ModeProgressStorage', () => {
  describe('defaults', () => {
    it('starts every mode at level 1 unlocked, no unlocks and no last result', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      expect(await storage.getProgress('quiz')).toEqual({
        schemaVersion: MODE_PROGRESS_SCHEMA_VERSION,
        maxUnlockedLevel: 1,
        unlockCount: 0,
        lastResult: null,
      });
      expect(await storage.getMaxUnlockedLevel('parejas')).toBe(1);
      expect(await storage.getUnlockCount('parejas')).toBe(0);
      expect(await storage.getLastResult('parejas')).toBeNull();
    });
  });

  describe('recordLevelUnlocked', () => {
    it('advances maxUnlockedLevel and increments unlockCount on a genuine advance', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      const updated = await storage.recordLevelUnlocked('quiz', 2);

      expect(updated).toMatchObject({ maxUnlockedLevel: 2, unlockCount: 1 });
      expect(await storage.getMaxUnlockedLevel('quiz')).toBe(2);
      expect(await storage.getUnlockCount('quiz')).toBe(1);
    });

    it('does not double-count unlockCount when a cleared level is replayed', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      await storage.recordLevelUnlocked('quiz', 2);
      // Replaying level 1 (already cleared) recomputes the same next level (2).
      const replayed = await storage.recordLevelUnlocked('quiz', 2);

      expect(replayed).toMatchObject({ maxUnlockedLevel: 2, unlockCount: 1 });
      expect(await storage.getUnlockCount('quiz')).toBe(1);
    });

    it('ignores a level lower than the one already unlocked', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      await storage.recordLevelUnlocked('quiz', 3);
      const result = await storage.recordLevelUnlocked('quiz', 2);

      expect(result).toMatchObject({ maxUnlockedLevel: 3, unlockCount: 1 });
    });

    it('keeps progress independent per mode', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      await storage.recordLevelUnlocked('quiz', 4);

      expect(await storage.getMaxUnlockedLevel('quiz')).toBe(4);
      expect(await storage.getMaxUnlockedLevel('laberinto')).toBe(1);
      expect(await storage.getUnlockCount('laberinto')).toBe(0);
    });

    it('is a no-op for a non-integer level or an invalid modeId', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      await storage.recordLevelUnlocked('quiz', 'two');
      await storage.recordLevelUnlocked('', 2);

      expect(await storage.getMaxUnlockedLevel('quiz')).toBe(1);
      expect(await storage.getUnlockCount('quiz')).toBe(0);
    });
  });

  describe('recordResult / getLastResult', () => {
    it('persists score/maxScore alongside the derived percentage and star tier', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      const result = await storage.recordResult('parejas', { score: 7, maxScore: 10, level: 2 });

      expect(result).toEqual({ score: 7, maxScore: 10, percentage: 70, stars: 3, level: 2 });
      expect(await storage.getLastResult('parejas')).toEqual(result);
    });

    it('defaults level to null for modes without a level chain', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      const result = await storage.recordResult('sombra', { score: 3, maxScore: 10 });

      expect(result.level).toBeNull();
    });

    it('overwrites the previous result rather than accumulating a history', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      await storage.recordResult('quiz', { score: 2, maxScore: 10 });
      await storage.recordResult('quiz', { score: 9, maxScore: 10 });

      expect(await storage.getLastResult('quiz')).toMatchObject({ score: 9, percentage: 90, stars: 3 });
    });

    it('keeps last result independent per mode', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      await storage.recordResult('quiz', { score: 5, maxScore: 10 });

      expect(await storage.getLastResult('laberinto')).toBeNull();
    });

    it('leaves unlock progress untouched when only a result is recorded', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter()]);

      await storage.recordLevelUnlocked('quiz', 3);
      await storage.recordResult('quiz', { score: 5, maxScore: 10 });

      expect(await storage.getMaxUnlockedLevel('quiz')).toBe(3);
      expect(await storage.getUnlockCount('quiz')).toBe(1);
    });
  });

  describe('persistence across reload', () => {
    it('survives a reload by reading the same namespaced key back on a fresh instance', async () => {
      const adapter = createFakeAdapter();
      const first = new ModeProgressStorage([adapter]);

      await first.recordLevelUnlocked('quiz', 3);
      await first.recordResult('quiz', { score: 8, maxScore: 10 });

      const reloaded = new ModeProgressStorage([adapter]);
      expect(await reloaded.getMaxUnlockedLevel('quiz')).toBe(3);
      expect(await reloaded.getUnlockCount('quiz')).toBe(1);
      expect(await reloaded.getLastResult('quiz')).toMatchObject({ score: 8 });
    });

    it('stores each mode under its own dinoquiz:-prefixed key', async () => {
      const store = new Map();
      const adapter = createFakeAdapter({
        async setItem(key, value) {
          store.set(key, value);
        },
      });
      const storage = new ModeProgressStorage([adapter]);

      await storage.recordLevelUnlocked('quiz', 2);
      await storage.recordLevelUnlocked('parejas', 2);

      expect(store.has(`${MODE_PROGRESS_KEY_PREFIX}quiz`)).toBe(true);
      expect(store.has(`${MODE_PROGRESS_KEY_PREFIX}parejas`)).toBe(true);
      expect(MODE_PROGRESS_KEY_PREFIX.startsWith('dinoquiz:')).toBe(true);
    });
  });

  describe('degraded/corrupted persistence', () => {
    it('discards a corrupted entry and logs the aggregated discard code', async () => {
      const store = new Map();
      store.set(`${MODE_PROGRESS_KEY_PREFIX}quiz`, '{not-json');
      const adapter = createFakeAdapter({
        async getItem(key) {
          return store.has(key) ? store.get(key) : null;
        },
      });
      const logService = createFakeLogService();
      const storage = new ModeProgressStorage([adapter], logService);

      const progress = await storage.getProgress('quiz');

      expect(progress).toEqual({
        schemaVersion: MODE_PROGRESS_SCHEMA_VERSION,
        maxUnlockedLevel: 1,
        unlockCount: 0,
        lastResult: null,
      });
      expect(logService.stateDiscardedCalls).toEqual([
        { modeId: 'quiz', code: MODE_PROGRESS_DISCARD_INCOMPATIBLE_CODE },
      ]);
    });

    it('discards an entry saved under a different schema version', async () => {
      const store = new Map();
      store.set(
        `${MODE_PROGRESS_KEY_PREFIX}quiz`,
        JSON.stringify({ schemaVersion: MODE_PROGRESS_SCHEMA_VERSION + 1, maxUnlockedLevel: 5, unlockCount: 4, lastResult: null })
      );
      const adapter = createFakeAdapter({
        async getItem(key) {
          return store.has(key) ? store.get(key) : null;
        },
      });
      const storage = new ModeProgressStorage([adapter], createFakeLogService());

      expect(await storage.getMaxUnlockedLevel('quiz')).toBe(1);
    });

    it('degrades to in-memory and logs a persist-error event when every adapter throws', async () => {
      const throwingAdapter = createFakeAdapter({
        async setItem() {
          throw new Error('quota exceeded');
        },
      });
      const logService = createFakeLogService();
      const storage = new ModeProgressStorage([throwingAdapter], logService);

      const updated = await storage.recordLevelUnlocked('quiz', 2);

      expect(updated).toMatchObject({ maxUnlockedLevel: 2, unlockCount: 1 });
      expect(logService.eventCalls).toContain('storage_mode_progress_persist_error');
      expect(storage.getDiagnostics()).toMatchObject({ backend: 'memory', isPersistent: false });
    });
  });

  describe('getDiagnostics', () => {
    it('reports the active backend name', async () => {
      const storage = new ModeProgressStorage([createFakeAdapter({ name: 'localStorage' })]);
      await storage.recordLevelUnlocked('quiz', 2);

      expect(storage.getDiagnostics()).toMatchObject({ backend: 'localStorage', isPersistent: true, failureCount: 0 });
    });
  });
});
