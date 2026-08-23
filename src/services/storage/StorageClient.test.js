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

  it('recordEvent is a non-PII local counter that increments on every call', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    expect(await storage.getEventCount('partida_iniciada')).toBe(0);

    await storage.recordEvent('partida_iniciada');
    await storage.recordEvent('partida_iniciada');
    await storage.recordEvent('partida_iniciada');

    expect(await storage.getEventCount('partida_iniciada')).toBe(3);
  });

  it('recordEvent tracks distinct event names independently', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    await storage.recordEvent('partida_iniciada');
    await storage.recordEvent('partida_iniciada');
    await storage.recordEvent('replay_pulsado');

    expect(await storage.get('analyticsEventCounts')).toEqual({
      partida_iniciada: 2,
      replay_pulsado: 1,
    });
  });

  describe('recordEvent normalizes the existing counter before incrementing (TRIOFSND-102)', () => {
    async function seedAnalyticsCounts(adapter, counts) {
      await adapter.setItem('dinoquiz:analyticsEventCounts', JSON.stringify(counts));
    }

    it('never string-concatenates a numeric-string counter (e.g. "5" + 1 must become 6, not "51")', async () => {
      const adapter = createFakeAdapter();
      await seedAnalyticsCounts(adapter, { replay_pulsado: '5' });
      const storage = new DinoQuizStorage([adapter]);

      const next = await storage.recordEvent('replay_pulsado');

      expect(next).toBe(6);
      expect(next).not.toBe('51');
      expect(typeof next).toBe('number');
    });

    it('treats an absent counter as 0 before incrementing', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      expect(await storage.recordEvent('partida_iniciada')).toBe(1);
    });

    it('treats a negative counter as 0 before incrementing', async () => {
      const adapter = createFakeAdapter();
      await seedAnalyticsCounts(adapter, { partida_iniciada: -7 });
      const storage = new DinoQuizStorage([adapter]);

      expect(await storage.recordEvent('partida_iniciada')).toBe(1);
    });

    it('floors a non-negative decimal counter before incrementing', async () => {
      const adapter = createFakeAdapter();
      await seedAnalyticsCounts(adapter, { partida_iniciada: 4.9 });
      const storage = new DinoQuizStorage([adapter]);

      expect(await storage.recordEvent('partida_iniciada')).toBe(5);
    });

    it('incrementing one counter modifies only that key and preserves every other key already in the store', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);
      await storage.recordEvent('partida_iniciada');
      await storage.recordEventOnce('first_tap_jugar');

      await storage.recordEvent('replay_pulsado');

      expect(await storage.get('analyticsEventCounts')).toEqual({
        partida_iniciada: 1,
        first_tap_jugar: 1,
        replay_pulsado: 1,
      });
    });
  });

  describe('getReplayRate (TRIOFSND-102): replay_pulsado / partida_iniciada, never NaN/Infinity', () => {
    it('is exactly 0 when partida_iniciada was never recorded', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      expect(await storage.getReplayRate()).toBe(0);
    });

    it('is exactly 0 when the stored partida_iniciada is invalid (non-numeric)', async () => {
      const adapter = createFakeAdapter();
      await adapter.setItem(
        'dinoquiz:analyticsEventCounts',
        JSON.stringify({ partida_iniciada: 'not-a-number', replay_pulsado: 3 })
      );
      const storage = new DinoQuizStorage([adapter]);

      expect(await storage.getReplayRate()).toBe(0);
    });

    it('is exactly 0 when partida_iniciada is 0', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);
      await storage.recordEvent('replay_pulsado');

      expect(await storage.getReplayRate()).toBe(0);
    });

    it('divides replay_pulsado by partida_iniciada once both are recorded', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordEvent('partida_iniciada');
      await storage.recordEvent('partida_iniciada');
      await storage.recordEvent('partida_iniciada');
      await storage.recordEvent('partida_iniciada');
      await storage.recordEvent('replay_pulsado');

      expect(await storage.getReplayRate()).toBe(0.25);
    });

    it('never returns NaN or Infinity', async () => {
      const adapter = createFakeAdapter();
      await adapter.setItem(
        'dinoquiz:analyticsEventCounts',
        JSON.stringify({ partida_iniciada: null, replay_pulsado: 'garbage' })
      );
      const storage = new DinoQuizStorage([adapter]);

      const rate = await storage.getReplayRate();

      expect(Number.isNaN(rate)).toBe(false);
      expect(Number.isFinite(rate)).toBe(true);
      expect(rate).toBe(0);
    });
  });

  it('persists replay_pulsado and partida_iniciada across instances sharing the same backend (TRIOFSND-102)', async () => {
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
    await storage.recordEvent('partida_iniciada');
    await storage.recordEvent('partida_iniciada');
    await storage.recordEvent('replay_pulsado');

    const reopened = new DinoQuizStorage([adapter()]);

    expect(await reopened.getEventCount('partida_iniciada')).toBe(2);
    expect(await reopened.getEventCount('replay_pulsado')).toBe(1);
  });
});
