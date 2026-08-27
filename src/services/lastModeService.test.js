'use strict';

const { getLastMode, setLastMode, LAST_MODE_STORAGE_KEY } = require('./lastModeService');

function makeStorage() {
  const store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    _store: store,
  };
}

describe('lastModeService — last-selected mode persistence', () => {
  it('returns null when nothing was ever recorded', () => {
    const storage = makeStorage();
    expect(getLastMode(storage)).toBeNull();
  });

  it('round-trips a mode id through the given storage adapter', () => {
    const storage = makeStorage();
    expect(setLastMode('laberinto', storage)).toBe(true);
    expect(getLastMode(storage)).toBe('laberinto');
  });

  it('overwrites a previously stored mode id', () => {
    const storage = makeStorage();
    setLastMode('quiz', storage);
    setLastMode('parejas', storage);
    expect(getLastMode(storage)).toBe('parejas');
  });

  it('namespaces the key under dinoquiz:', () => {
    const storage = makeStorage();
    setLastMode('sombra', storage);
    expect(LAST_MODE_STORAGE_KEY).toBe('dinoquiz:lastMode');
    expect(storage._store[LAST_MODE_STORAGE_KEY]).toBe(JSON.stringify('sombra'));
  });

  it('rejects non-string or empty modeId without throwing', () => {
    const storage = makeStorage();
    expect(setLastMode('', storage)).toBe(false);
    expect(setLastMode(null, storage)).toBe(false);
    expect(setLastMode(undefined, storage)).toBe(false);
    expect(setLastMode(42, storage)).toBe(false);
    expect(getLastMode(storage)).toBeNull();
  });

  it('returns null instead of throwing when the stored value is corrupted JSON', () => {
    const storage = makeStorage();
    storage.setItem(LAST_MODE_STORAGE_KEY, '{not-json');
    expect(getLastMode(storage)).toBeNull();
  });

  it('returns null when the stored value decodes to a non-string', () => {
    const storage = makeStorage();
    storage.setItem(LAST_MODE_STORAGE_KEY, JSON.stringify(42));
    expect(getLastMode(storage)).toBeNull();
  });

  it('degrades to a no-op false/null when no storage is available', () => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
    try {
      expect(setLastMode('quiz', null)).toBe(false);
      expect(getLastMode(null)).toBeNull();
    } finally {
      Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, configurable: true });
    }
  });

  it('surfaces a throwing setItem as a false return instead of throwing', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(setLastMode('quiz', storage)).toBe(false);
  });

  it('surfaces a throwing getItem as a null return instead of throwing', () => {
    const storage = {
      getItem: () => {
        throw new Error('boom');
      },
      setItem: () => {},
    };
    expect(getLastMode(storage)).toBeNull();
  });
});
