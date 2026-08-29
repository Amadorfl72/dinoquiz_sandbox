'use strict';

const { getEntries, addEntry, clearAll, STORAGE_KEY, MAX_ENTRIES } = require('./hallOfFameService');

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

describe('hallOfFameService — top-10 local scores', () => {
  it('namespaces the key under dinoquiz: and caps the list at 10', () => {
    expect(STORAGE_KEY).toBe('dinoquiz:hallOfFame');
    expect(MAX_ENTRIES).toBe(10);
  });

  it('returns [] when nothing was ever saved', () => {
    const storage = makeStorage();
    expect(getEntries(storage)).toEqual([]);
  });

  describe('ordering', () => {
    it('sorts entries by score descending', () => {
      const storage = makeStorage();
      addEntry({ name: 'Ana', score: 4, timestamp: 1 }, storage);
      addEntry({ name: 'Leo', score: 9, timestamp: 2 }, storage);
      addEntry({ name: 'Mia', score: 6, timestamp: 3 }, storage);

      expect(getEntries(storage).map((e) => e.name)).toEqual(['Leo', 'Mia', 'Ana']);
    });

    it('applies the documented tie-break (earlier timestamp wins) and keeps that order stable on repeat reads', () => {
      const storage = makeStorage();
      addEntry({ name: 'Later', score: 7, timestamp: 200 }, storage);
      addEntry({ name: 'Earlier', score: 7, timestamp: 100 }, storage);

      const firstRead = getEntries(storage).map((e) => e.name);
      expect(firstRead).toEqual(['Earlier', 'Later']);

      // Reading again (no new writes) must not reshuffle the tie.
      expect(getEntries(storage).map((e) => e.name)).toEqual(firstRead);
    });
  });

  describe('cutoff at 10 entries', () => {
    it('truncates to exactly 10, dropping the 11th (lowest) score', () => {
      const storage = makeStorage();
      for (let score = 1; score <= 10; score += 1) {
        addEntry({ name: `p${score}`, score, timestamp: score }, storage);
      }
      // Weakest score so far: dropped once an 11th, stronger entry arrives.
      const result = addEntry({ name: 'newcomer', score: 5, timestamp: 999 }, storage);

      expect(result).toHaveLength(10);
      expect(result.map((e) => e.name)).not.toContain('p1');
      expect(getEntries(storage)).toHaveLength(10);
    });

    it('keeps the strongest score when an 11th weaker entry is added', () => {
      const storage = makeStorage();
      for (let score = 10; score >= 1; score -= 1) {
        addEntry({ name: `p${score}`, score, timestamp: score }, storage);
      }
      addEntry({ name: 'weakest', score: 0, timestamp: 999 }, storage);

      const names = getEntries(storage).map((e) => e.name);
      expect(names).toHaveLength(10);
      expect(names).not.toContain('weakest');
      expect(names[0]).toBe('p10');
    });
  });

  describe('no-name / guest contract', () => {
    it('stores a missing name as name: null, never an empty string', () => {
      const storage = makeStorage();
      addEntry({ score: 8, timestamp: 1 }, storage);

      const [entry] = getEntries(storage);
      expect(entry.name).toBeNull();
      expect(entry.name).not.toBe('');
    });

    it('normalizes an empty or whitespace-only name to null', () => {
      const storage = makeStorage();
      addEntry({ name: '', score: 3, timestamp: 1 }, storage);
      addEntry({ name: '   ', score: 5, timestamp: 2 }, storage);

      const entries = getEntries(storage);
      expect(entries.every((e) => e.name === null)).toBe(true);
    });

    it('never drops a guest entry from the list', () => {
      const storage = makeStorage();
      addEntry({ name: null, score: 7, timestamp: 1 }, storage);

      expect(getEntries(storage)).toHaveLength(1);
    });

    it('trims and preserves a real name unchanged otherwise', () => {
      const storage = makeStorage();
      addEntry({ name: '  Rex  ', score: 6, timestamp: 1 }, storage);

      expect(getEntries(storage)[0].name).toBe('Rex');
    });
  });

  describe('clearAll', () => {
    it('wipes every stored entry', () => {
      const storage = makeStorage();
      addEntry({ name: 'Ana', score: 4, timestamp: 1 }, storage);
      expect(getEntries(storage)).toHaveLength(1);

      expect(clearAll(storage)).toBe(true);
      expect(getEntries(storage)).toEqual([]);
      expect(storage._store[STORAGE_KEY]).toBeUndefined();
    });

    it('resolves to false when storage is unavailable, without throwing', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
      try {
        expect(clearAll(null)).toBe(false);
      } finally {
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, configurable: true });
      }
    });
  });

  describe('tolerate-storage-failure pattern (AW8)', () => {
    it('addEntry still returns the computed list even if the write throws', () => {
      const storage = {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota exceeded');
        },
      };

      const result = addEntry({ name: 'Ana', score: 4, timestamp: 1 }, storage);
      expect(result).toEqual([{ name: 'Ana', score: 4, timestamp: 1 }]);
    });

    it('getEntries degrades to [] instead of throwing when getItem throws', () => {
      const storage = {
        getItem: () => {
          throw new Error('boom');
        },
        setItem: () => {},
      };
      expect(getEntries(storage)).toEqual([]);
    });

    it('getEntries degrades to [] on corrupted JSON', () => {
      const storage = makeStorage();
      storage.setItem(STORAGE_KEY, '{not-json');
      expect(getEntries(storage)).toEqual([]);
    });

    it('getEntries degrades to [] when the stored value is not an array', () => {
      const storage = makeStorage();
      storage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
      expect(getEntries(storage)).toEqual([]);
    });

    it('addEntry skips a non-finite score/timestamp without corrupting the list', () => {
      const storage = makeStorage();
      addEntry({ name: 'Ana', score: 4, timestamp: 1 }, storage);
      const result = addEntry({ name: 'Bad', score: NaN, timestamp: 2 }, storage);

      expect(result).toEqual([{ name: 'Ana', score: 4, timestamp: 1 }]);
    });

    it('degrades to a no-op empty/false result when no storage is available at all', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
      try {
        expect(getEntries(null)).toEqual([]);
        expect(addEntry({ name: 'Ana', score: 4, timestamp: 1 }, null)).toEqual([
          { name: 'Ana', score: 4, timestamp: 1 },
        ]);
      } finally {
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, configurable: true });
      }
    });
  });
});
