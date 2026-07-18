const { DinoQuizStorage } = require('./StorageClient');

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

describe('DinoQuizStorage', () => {
  it('returns default state before any value is set', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);
    expect(await storage.get('bestScore')).toBe(0);
    expect(await storage.get('maxStreak')).toBe(0);
    expect(await storage.get('discoveredFunFacts')).toEqual([]);
    expect(await storage.get('muted')).toBe(false);
    expect(await storage.get('homeTooltipSeen')).toBe(false);
    expect(await storage.get('analyticsEventCounts')).toEqual({});
    expect(await storage.get('questionStats')).toEqual({});
  });

  it('persists and reads back values through the active adapter', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);
    await storage.set('bestScore', 7);
    expect(await storage.get('bestScore')).toBe(7);
    expect(storage.getDiagnostics()).toMatchObject({ backend: 'memory', failureCount: 0 });
  });

  it('notifies subscribers when a value changes', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);
    const listener = jest.fn();
    storage.subscribe('muted', listener);

    await storage.set('muted', true);

    expect(listener).toHaveBeenCalledWith(true);
  });

  it('stops notifying after unsubscribe', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);
    const listener = jest.fn();
    const unsubscribe = storage.subscribe('muted', listener);
    unsubscribe();

    await storage.set('muted', true);

    expect(listener).not.toHaveBeenCalled();
  });

  it('falls back to the next adapter when the first one reports unavailable', async () => {
    const unavailable = createFakeAdapter({
      async isAvailable() {
        return false;
      },
    });
    const fallback = createFakeAdapter();
    const storage = new DinoQuizStorage([unavailable, fallback]);

    await storage.set('maxStreak', 5);

    expect(await storage.get('maxStreak')).toBe(5);
    expect(storage.getDiagnostics().backend).toBe('memory');
  });

  it('degrades to an in-memory cache and stays usable when every adapter throws', async () => {
    const broken = createFakeAdapter({
      async isAvailable() {
        throw new Error('boom');
      },
    });
    const storage = new DinoQuizStorage([broken]);

    await expect(storage.set('bestScore', 3)).resolves.toBeDefined();
    expect(await storage.get('bestScore')).toBe(3);

    const diagnostics = storage.getDiagnostics();
    expect(diagnostics.isPersistent).toBe(false);
    expect(diagnostics.failureCount).toBeGreaterThan(0);
  });

  it('reports set() as not durably persisted when writes fail after init', async () => {
    const adapter = createFakeAdapter({
      async setItem() {
        throw new Error('quota exceeded');
      },
    });
    const storage = new DinoQuizStorage([adapter]);

    const persisted = await storage.set('bestScore', 9);

    expect(persisted).toBe(false);
    expect(await storage.get('bestScore')).toBe(9);
    expect(storage.getDiagnostics().failureCount).toBeGreaterThan(0);
  });

  it('falls back to the next adapter when the active one throws on write, and persists there', async () => {
    const indexedDb = createFakeAdapter({
      name: 'indexedDB',
      async setItem() {
        throw new Error('access denied');
      },
    });
    const localStorage = createFakeAdapter({ name: 'localStorage' });
    const storage = new DinoQuizStorage([indexedDb, localStorage]);

    const persisted = await storage.set('bestScore', 9);

    expect(persisted).toBe(true);
    expect(storage.getDiagnostics()).toMatchObject({ backend: 'localStorage', isPersistent: true });

    const unavailableIndexedDb = createFakeAdapter({
      name: 'indexedDB',
      async isAvailable() {
        return false;
      },
    });
    const fresh = new DinoQuizStorage([unavailableIndexedDb, localStorage]);
    expect(await fresh.get('bestScore')).toBe(9);
  });

  it('tracks discovered fun facts without duplicates', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.markFunFactDiscovered('trex-01');
    await storage.markFunFactDiscovered('trex-01');
    await storage.markFunFactDiscovered('triceratops-02');

    expect(await storage.get('discoveredFunFacts')).toEqual(['trex-01', 'triceratops-02']);
  });

  it('only raises bestScore and maxStreak when the new value is higher', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.recordScore(5);
    await storage.recordScore(3);
    expect(await storage.get('bestScore')).toBe(5);

    await storage.recordStreak(4);
    await storage.recordStreak(2);
    expect(await storage.get('maxStreak')).toBe(4);
  });

  it('toggleMute flips and returns the new state', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    const first = await storage.toggleMute();
    const second = await storage.toggleMute();

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('marks the home tooltip as seen so it does not reappear on later opens', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    expect(await storage.hasSeenHomeTooltip()).toBe(false);

    await storage.markHomeTooltipSeen();

    expect(await storage.hasSeenHomeTooltip()).toBe(true);
  });

  it('persists the home tooltip flag across instances sharing the same backend', async () => {
    const store = new Map();
    const adapter = () =>
      createFakeAdapter({
        async getItem(key) {
          return store.has(key) ? store.get(key) : null;
        },
        async setItem(key, value) {
          store.set(key, value);
        },
      });
    const storage = new DinoQuizStorage([adapter()]);
    await storage.markHomeTooltipSeen();

    const reopened = new DinoQuizStorage([adapter()]);
    expect(await reopened.hasSeenHomeTooltip()).toBe(true);
  });

  it('recordEventOnce is a non-PII local counter that only increments the first time', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    expect(await storage.getEventCount('first_tap_jugar')).toBe(0);

    await storage.recordEventOnce('first_tap_jugar');
    await storage.recordEventOnce('first_tap_jugar');
    await storage.recordEventOnce('first_tap_jugar');

    expect(await storage.getEventCount('first_tap_jugar')).toBe(1);
  });

  it('recordEventOnce tracks distinct event names independently', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.recordEventOnce('first_tap_jugar');
    await storage.recordEventOnce('mute_toggled');

    expect(await storage.get('analyticsEventCounts')).toEqual({
      first_tap_jugar: 1,
      mute_toggled: 1,
    });
  });

  it('recordQuestionAnswered aggregates attempts and failures per question id, without a per-answer log', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.recordQuestionAnswered('trex-01', true);
    await storage.recordQuestionAnswered('trex-01', false);
    await storage.recordQuestionAnswered('trex-01', false);

    expect(await storage.getQuestionStats('trex-01')).toEqual({ attempts: 3, failures: 2 });
    expect(await storage.get('questionStats')).toEqual({ 'trex-01': { attempts: 3, failures: 2 } });
  });

  it('recordQuestionAnswered tracks distinct question ids independently', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.recordQuestionAnswered('trex-01', true);
    await storage.recordQuestionAnswered('triceratops-02', false);

    expect(await storage.getQuestionStats('trex-01')).toEqual({ attempts: 1, failures: 0 });
    expect(await storage.getQuestionStats('triceratops-02')).toEqual({ attempts: 1, failures: 1 });
  });

  it('getQuestionStats defaults to zero attempts/failures for an unanswered question', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    expect(await storage.getQuestionStats('never-answered')).toEqual({ attempts: 0, failures: 0 });
  });

  it('getQuestionFailureRate computes the aggregated % de fallo por pregunta', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    expect(await storage.getQuestionFailureRate('trex-01')).toBe(0);

    await storage.recordQuestionAnswered('trex-01', true);
    await storage.recordQuestionAnswered('trex-01', false);
    await storage.recordQuestionAnswered('trex-01', false);
    await storage.recordQuestionAnswered('trex-01', false);

    expect(await storage.getQuestionFailureRate('trex-01')).toBe(0.75);
  });

  it('recordQuestionAnswered ignores a missing/empty question id instead of creating an anonymous key', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.recordQuestionAnswered(undefined, false);
    await storage.recordQuestionAnswered('', true);
    await storage.recordQuestionAnswered(null, false);

    expect(await storage.get('questionStats')).toEqual({});
  });

  it('persists the questionStats aggregate across instances sharing the same backend', async () => {
    const store = new Map();
    const adapter = () =>
      createFakeAdapter({
        async getItem(key) {
          return store.has(key) ? store.get(key) : null;
        },
        async setItem(key, value) {
          store.set(key, value);
        },
      });
    const storage = new DinoQuizStorage([adapter()]);
    await storage.recordQuestionAnswered('trex-01', false);

    const reopened = new DinoQuizStorage([adapter()]);
    expect(await reopened.getQuestionStats('trex-01')).toEqual({ attempts: 1, failures: 1 });
  });

  it('recordQuestionAnswered stores only aggregated counts, no per-child or per-answer identifiers', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.recordQuestionAnswered('trex-01', false);
    const stats = await storage.getQuestionStats('trex-01');

    expect(Object.keys(stats).sort()).toEqual(['attempts', 'failures']);
    expect(stats).not.toHaveProperty('userId');
    expect(stats).not.toHaveProperty('deviceId');
    expect(stats).not.toHaveProperty('timestamp');
    expect(stats).not.toHaveProperty('selectedOption');
  });
});
