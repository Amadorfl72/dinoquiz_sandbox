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
    expect(await storage.get('questionAnsweredEvents')).toEqual([]);
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

  it('hasRemovedAds defaults to false and reflects setAdsRemoved (TRIOFSND-97)', async () => {
    const storage = new DinoQuizStorage([createFakeAdapter()]);

    expect(await storage.hasRemovedAds()).toBe(false);

    await storage.setAdsRemoved(true);

    expect(await storage.hasRemovedAds()).toBe(true);
  });

  it('persists the ads-removed flag across instances sharing the same backend', async () => {
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
    await storage.setAdsRemoved(true);

    const reopened = new DinoQuizStorage([adapter()]);
    expect(await reopened.hasRemovedAds()).toBe(true);
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

  describe('TRIOFSND-92: aggregated acierto/fallo view over questionStats (recordQuestionResult)', () => {
    it('recordQuestionResult aggregates acierto and fallo counts per id_pregunta over the shared questionStats aggregate', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionResult('trex-01', 'acierto');
      await storage.recordQuestionResult('trex-01', 'fallo');
      await storage.recordQuestionResult('trex-01', 'fallo');

      expect(await storage.getQuestionResults('trex-01')).toEqual({ acierto: 1, fallo: 2 });
      expect(await storage.get('questionStats')).toEqual({
        'trex-01': { total_respuestas: 3, total_aciertos: 1 },
      });
    });

    it('recordQuestionResult tracks distinct question ids independently', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionResult('trex-01', 'acierto');
      await storage.recordQuestionResult('triceratops-02', 'fallo');

      expect(await storage.getQuestionResults('trex-01')).toEqual({ acierto: 1, fallo: 0 });
      expect(await storage.getQuestionResults('triceratops-02')).toEqual({ acierto: 0, fallo: 1 });
    });

    it('getQuestionResults defaults to zero acierto/fallo for an unanswered question', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      expect(await storage.getQuestionResults('never-answered')).toEqual({ acierto: 0, fallo: 0 });
    });

    it('getQuestionFailureRate computes the aggregated % de fallo por pregunta', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      expect(await storage.getQuestionFailureRate('trex-01')).toBe(0);

      await storage.recordQuestionResult('trex-01', 'acierto');
      await storage.recordQuestionResult('trex-01', 'fallo');
      await storage.recordQuestionResult('trex-01', 'fallo');
      await storage.recordQuestionResult('trex-01', 'fallo');

      expect(await storage.getQuestionFailureRate('trex-01')).toBe(75);
    });

    it('recordQuestionResult ignores a missing/empty question id instead of creating an anonymous key', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionResult(undefined, 'fallo');
      await storage.recordQuestionResult('', 'acierto');
      await storage.recordQuestionResult(null, 'fallo');

      expect(await storage.get('questionStats')).toEqual({});
      expect(await storage.get('questionAnsweredEvents')).toEqual([]);
    });

    it('recordQuestionResult ignores a resultado outside of acierto/fallo', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionResult('trex-01', 'correct');
      await storage.recordQuestionResult('trex-01', '');
      await storage.recordQuestionResult('trex-01', undefined);

      expect(await storage.get('questionStats')).toEqual({});
      expect(await storage.get('questionAnsweredEvents')).toEqual([]);
    });

    it('persists the acierto/fallo aggregate across instances sharing the same backend', async () => {
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
      await storage.recordQuestionResult('trex-01', 'fallo');

      const reopened = new DinoQuizStorage([adapter()]);
      expect(await reopened.getQuestionResults('trex-01')).toEqual({ acierto: 0, fallo: 1 });
    });

    it('recordQuestionResult stores only aggregated counts, no per-child or per-answer identifiers', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionResult('trex-01', 'fallo');
      const results = await storage.getQuestionResults('trex-01');

      expect(Object.keys(results).sort()).toEqual(['acierto', 'fallo']);
      expect(results).not.toHaveProperty('userId');
      expect(results).not.toHaveProperty('deviceId');
      expect(results).not.toHaveProperty('timestamp');
      expect(results).not.toHaveProperty('selectedOption');
    });
  });

  describe('TRIOFSND-80: pregunta_respondida event + incremental per-question aggregate', () => {
    it('records a pregunta_respondida event with tipo/id_pregunta/acierto=true on a hit, no PII payload', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionAnswered('trex-01', true);

      expect(await storage.get('questionAnsweredEvents')).toEqual([
        { tipo: 'pregunta_respondida', id_pregunta: 'trex-01', acierto: true },
      ]);
      expect(await storage.getEventCount('pregunta_respondida')).toBe(1);
    });

    it('records a pregunta_respondida event with acierto=false on a miss', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionAnswered('trex-01', false);

      expect(await storage.get('questionAnsweredEvents')).toEqual([
        { tipo: 'pregunta_respondida', id_pregunta: 'trex-01', acierto: false },
      ]);
    });

    it('empty state: a question with no answers has zeroed counters and a 0 percentage', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      expect(await storage.getQuestionStats('never-answered')).toEqual({
        total_respuestas: 0,
        total_aciertos: 0,
        porcentaje_acierto: 0,
      });
    });

    it('first acierto on a question with no history yields 1/1 and 100%', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      const stats = await storage.recordQuestionAnswered('trex-01', true);

      expect(stats).toEqual({ total_respuestas: 1, total_aciertos: 1, porcentaje_acierto: 100 });
      expect(await storage.getQuestionStats('trex-01')).toEqual(stats);
    });

    it('first fallo on a question with no history yields 1/0 and 0%', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      const stats = await storage.recordQuestionAnswered('trex-01', false);

      expect(stats).toEqual({ total_respuestas: 1, total_aciertos: 0, porcentaje_acierto: 0 });
    });

    it('a correct/incorrect/correct sequence on the same question yields 3/2 and ~66.666...%, unrounded', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionAnswered('trex-01', true);
      await storage.recordQuestionAnswered('trex-01', false);
      const stats = await storage.recordQuestionAnswered('trex-01', true);

      expect(stats.total_respuestas).toBe(3);
      expect(stats.total_aciertos).toBe(2);
      expect(stats.porcentaje_acierto).toBeCloseTo((2 / 3) * 100, 10);
      expect(await storage.getEventCount('pregunta_respondida')).toBe(3);
    });

    it('tracks distinct questions independently', async () => {
      const storage = new DinoQuizStorage([createFakeAdapter()]);

      await storage.recordQuestionAnswered('trex-01', true);
      await storage.recordQuestionAnswered('triceratops-01', false);
      await storage.recordQuestionAnswered('triceratops-01', false);

      expect(await storage.get('questionStats')).toEqual({
        'trex-01': { total_respuestas: 1, total_aciertos: 1 },
        'triceratops-01': { total_respuestas: 2, total_aciertos: 0 },
      });
      expect(await storage.getQuestionStats('trex-01')).toEqual({
        total_respuestas: 1,
        total_aciertos: 1,
        porcentaje_acierto: 100,
      });
      expect(await storage.getQuestionStats('triceratops-01')).toEqual({
        total_respuestas: 2,
        total_aciertos: 0,
        porcentaje_acierto: 0,
      });
    });

    it('the event history and aggregate survive a reload (a fresh instance sharing the same backend)', async () => {
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
      await storage.recordQuestionAnswered('trex-01', true);
      await storage.recordQuestionAnswered('trex-01', false);

      const reopened = new DinoQuizStorage([adapter()]);

      expect(await reopened.getQuestionStats('trex-01')).toEqual({
        total_respuestas: 2,
        total_aciertos: 1,
        porcentaje_acierto: 50,
      });
      expect(await reopened.get('questionAnsweredEvents')).toEqual([
        { tipo: 'pregunta_respondida', id_pregunta: 'trex-01', acierto: true },
        { tipo: 'pregunta_respondida', id_pregunta: 'trex-01', acierto: false },
      ]);
    });
  });
});
