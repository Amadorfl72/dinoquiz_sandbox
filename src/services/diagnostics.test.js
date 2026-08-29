'use strict';

const {
  incrementCounter,
  getCounters,
  recordLocalReturn,
  computeSevenDayRetention,
  recordError,
  getErrors,
  resetDiagnostics,
  COUNTERS_KEY,
  ERRORS_KEY,
  RETENTION_KEY,
  DIAGNOSTICS_KEYS,
} = require('./diagnostics');

function makeStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    _store: store,
  };
}

describe('diagnostics — local aggregated counters, retention and structured errors', () => {
  // diagnostics.js's in-memory degradation fallback is a module-level
  // singleton (it must survive across calls that share one real
  // localStorage, exactly like a real browser only ever has one). Tests
  // create a fresh fake storage per case, so this clears that shared
  // fallback between tests to keep them independent -- resetDiagnostics()
  // unconditionally deletes its own three fallback entries regardless of
  // whether the real (jsdom) localStorage read/write itself succeeds.
  afterEach(() => {
    resetDiagnostics();
  });

  describe('incrementCounter/getCounters', () => {
    it('starts every counter at 0 and tallies from there', () => {
      const storage = makeStorage();
      expect(getCounters(storage)).toEqual({});
      expect(incrementCounter('selectorOpen', storage)).toBe(1);
      expect(incrementCounter('selectorOpen', storage)).toBe(2);
      expect(getCounters(storage)).toEqual({ selectorOpen: 2 });
    });

    it('keeps independent counts for different opaque counter names (mode/level breakdowns included)', () => {
      const storage = makeStorage();
      incrementCounter('gameStarted:parejas', storage);
      incrementCounter('gameStarted:parejas', storage);
      incrementCounter('gamesByModeLevel:parejas:2', storage);
      incrementCounter('correctAnswers:parejas', storage);
      incrementCounter('starsEarned:parejas', storage);
      incrementCounter('starsEarned:parejas', storage);
      incrementCounter('starsEarned:parejas', storage);
      incrementCounter('unlocks:parejas', storage);
      incrementCounter('gameStarted:laberinto', storage);

      expect(getCounters(storage)).toEqual({
        'gameStarted:parejas': 2,
        'gamesByModeLevel:parejas:2': 1,
        'correctAnswers:parejas': 1,
        'starsEarned:parejas': 3,
        'unlocks:parejas': 1,
        'gameStarted:laberinto': 1,
      });
    });

    it('namespaces the counters map under dinoquiz:metrics:', () => {
      const storage = makeStorage();
      incrementCounter('selectorOpen', storage);
      expect(COUNTERS_KEY).toBe('dinoquiz:metrics:counters');
      expect(JSON.parse(storage._store[COUNTERS_KEY])).toEqual({ selectorOpen: 1 });
    });

    it('rejects an invalid counter name without writing anything', () => {
      const storage = makeStorage();
      expect(incrementCounter('', storage)).toBe(0);
      expect(incrementCounter(null, storage)).toBe(0);
      expect(getCounters(storage)).toEqual({});
    });

    it('keeps tallying via the in-memory fallback, without throwing, when storage getItem/setItem throw', () => {
      const throwingStorage = {
        getItem: () => {
          throw new Error('boom');
        },
        setItem: () => {
          throw new Error('boom');
        },
        removeItem: () => {},
      };
      expect(incrementCounter('selectorOpen', throwingStorage)).toBe(1);
      expect(getCounters(throwingStorage)).toEqual({ selectorOpen: 1 });
    });
  });

  describe('recordLocalReturn/computeSevenDayRetention', () => {
    it('is false when the app was never opened', () => {
      const storage = makeStorage();
      expect(computeSevenDayRetention(storage)).toBe(false);
    });

    it('is false for a single install-day open with no later return', () => {
      const storage = makeStorage();
      recordLocalReturn(new Date('2026-08-01T10:00:00'), storage);
      expect(computeSevenDayRetention(storage)).toBe(false);
    });

    it('is true when the player returns on a later day within the 7-day window', () => {
      const storage = makeStorage();
      recordLocalReturn(new Date('2026-08-01T10:00:00'), storage);
      recordLocalReturn(new Date('2026-08-05T10:00:00'), storage);
      expect(computeSevenDayRetention(storage)).toBe(true);
    });

    it('is true exactly at the 7-day boundary and false just past it', () => {
      const storage = makeStorage();
      recordLocalReturn(new Date('2026-08-01T10:00:00'), storage);
      recordLocalReturn(new Date('2026-08-08T10:00:00'), storage);
      expect(computeSevenDayRetention(storage)).toBe(true);

      const storageTooLate = makeStorage();
      recordLocalReturn(new Date('2026-08-01T10:00:00'), storageTooLate);
      recordLocalReturn(new Date('2026-08-09T10:00:00'), storageTooLate);
      expect(computeSevenDayRetention(storageTooLate)).toBe(false);
    });

    it('does not move the install date on repeat opens, and dedupes same-day opens', () => {
      const storage = makeStorage();
      recordLocalReturn(new Date('2026-08-01T09:00:00'), storage);
      recordLocalReturn(new Date('2026-08-01T20:00:00'), storage);
      const record = JSON.parse(storage._store[RETENTION_KEY]);
      expect(record.installDate).toBe('2026-08-01');
      expect(record.returnDates).toEqual(['2026-08-01']);
    });

    it('never uses a remote identifier -- the record only holds local calendar dates', () => {
      const storage = makeStorage();
      recordLocalReturn(new Date('2026-08-01T09:00:00'), storage);
      const record = JSON.parse(storage._store[RETENTION_KEY]);
      expect(Object.keys(record).sort()).toEqual(['installDate', 'returnDates']);
    });
  });

  describe('recordError/getErrors', () => {
    it('persists only date, mode, category and code -- never player content', () => {
      const storage = makeStorage();
      const now = new Date('2026-08-15T12:00:00');
      expect(recordError('parejas', 'render', 'BOARD_RENDER_FAILED', storage)).toBe(true);
      // Freeze "today" indirectly by asserting shape, not the exact date value.
      const [entry] = getErrors(storage);
      expect(Object.keys(entry).sort()).toEqual(['category', 'code', 'date', 'mode']);
      expect(entry.mode).toBe('parejas');
      expect(entry.category).toBe('render');
      expect(entry.code).toBe('BOARD_RENDER_FAILED');
      expect(typeof entry.date).toBe('string');
      void now;
    });

    it('accumulates multiple errors in order', () => {
      const storage = makeStorage();
      recordError('clasifica', 'data', 'MISSING_CREATURE', storage);
      recordError('timeline', 'render', 'ROUND_RENDER_FAILED', storage);
      const errors = getErrors(storage);
      expect(errors).toHaveLength(2);
      expect(errors[0].code).toBe('MISSING_CREATURE');
      expect(errors[1].code).toBe('ROUND_RENDER_FAILED');
    });

    it('rejects missing/empty fields without recording anything', () => {
      const storage = makeStorage();
      expect(recordError('', 'render', 'X', storage)).toBe(false);
      expect(recordError('parejas', '', 'X', storage)).toBe(false);
      expect(recordError('parejas', 'render', '', storage)).toBe(false);
      expect(recordError(null, null, null, storage)).toBe(false);
      expect(getErrors(storage)).toEqual([]);
    });

    it('rotates the oldest entries once MAX_ERROR_ENTRIES is exceeded', () => {
      const storage = makeStorage();
      for (let i = 0; i < 505; i += 1) {
        recordError('quiz', 'logic', `CODE_${i}`, storage);
      }
      const errors = getErrors(storage);
      expect(errors).toHaveLength(500);
      expect(errors[0].code).toBe('CODE_5');
      expect(errors[errors.length - 1].code).toBe('CODE_504');
    });
  });

  describe('resetDiagnostics', () => {
    it('clears counters, errors and retention, and only those keys', () => {
      const storage = makeStorage();
      incrementCounter('selectorOpen', storage);
      recordLocalReturn(new Date('2026-08-01T10:00:00'), storage);
      recordError('parejas', 'render', 'BOARD_RENDER_FAILED', storage);
      storage.setItem('dinoquiz:modeProgress:parejas', JSON.stringify({ maxUnlockedLevel: 3 }));
      storage.setItem('dinoquiz:hallOfFame', JSON.stringify([{ name: null, score: 10, timestamp: 1 }]));

      resetDiagnostics(storage);

      expect(getCounters(storage)).toEqual({});
      expect(getErrors(storage)).toEqual([]);
      expect(computeSevenDayRetention(storage)).toBe(false);
      DIAGNOSTICS_KEYS.forEach((key) => {
        expect(Object.prototype.hasOwnProperty.call(storage._store, key)).toBe(false);
      });

      // Progress/results keys owned by other services must survive untouched.
      expect(storage._store['dinoquiz:modeProgress:parejas']).toBe(JSON.stringify({ maxUnlockedLevel: 3 }));
      expect(storage._store['dinoquiz:hallOfFame']).toBe(JSON.stringify([{ name: null, score: 10, timestamp: 1 }]));
    });

    it('degrades without throwing when storage is unavailable', () => {
      expect(() => resetDiagnostics({
        getItem: () => { throw new Error('boom'); },
        setItem: () => { throw new Error('boom'); },
        removeItem: () => { throw new Error('boom'); },
      })).not.toThrow();
    });
  });

  describe('in-memory degradation when localStorage is unavailable', () => {
    it('keeps accumulating counters/errors/retention via the shared in-memory fallback across calls', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('blocked');
        },
      });
      try {
        resetDiagnostics();
        expect(incrementCounter('selectorOpen')).toBe(1);
        expect(incrementCounter('selectorOpen')).toBe(2);
        expect(getCounters()).toEqual({ selectorOpen: 2 });

        expect(recordError('parejas', 'render', 'BOARD_RENDER_FAILED')).toBe(false);
        expect(getErrors()).toHaveLength(1);

        recordLocalReturn(new Date('2026-08-01T10:00:00'));
        recordLocalReturn(new Date('2026-08-03T10:00:00'));
        expect(computeSevenDayRetention()).toBe(true);
      } finally {
        Object.defineProperty(window, 'localStorage', originalDescriptor);
        resetDiagnostics();
      }
    });
  });
});
