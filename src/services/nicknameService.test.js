'use strict';

const { getNickname, saveNickname, clearNickname, NICKNAME_STORAGE_KEY } = require('./nicknameService');

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

describe('nicknameService — local nickname ("apodo") persistence', () => {
  it('returns null when nothing was ever saved', () => {
    const storage = makeStorage();
    expect(getNickname(storage)).toBeNull();
  });

  it('round-trips a nickname through the given storage adapter', () => {
    const storage = makeStorage();
    expect(saveNickname('Rex', storage)).toBe(true);
    expect(getNickname(storage)).toBe('Rex');
  });

  it('namespaces the key under dinoquiz:', () => {
    const storage = makeStorage();
    saveNickname('Rex', storage);
    expect(NICKNAME_STORAGE_KEY).toBe('dinoquiz:nickname');
    expect(storage._store[NICKNAME_STORAGE_KEY]).toBe(JSON.stringify('Rex'));
  });

  it('overwrites a previously stored nickname', () => {
    const storage = makeStorage();
    saveNickname('Rex', storage);
    saveNickname('Trixi', storage);
    expect(getNickname(storage)).toBe('Trixi');
  });

  it('trims surrounding whitespace before persisting and reading', () => {
    const storage = makeStorage();
    saveNickname('  Rex  ', storage);
    expect(storage._store[NICKNAME_STORAGE_KEY]).toBe(JSON.stringify('Rex'));
    expect(getNickname(storage)).toBe('Rex');
  });

  it('treats an empty or whitespace-only value as no nickname, never creating an empty entry', () => {
    const storage = makeStorage();
    expect(saveNickname('', storage)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(storage._store, NICKNAME_STORAGE_KEY)).toBe(false);

    expect(saveNickname('   ', storage)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(storage._store, NICKNAME_STORAGE_KEY)).toBe(false);
    expect(getNickname(storage)).toBeNull();
  });

  it('clears a previously stored nickname when saved as blank', () => {
    const storage = makeStorage();
    saveNickname('Rex', storage);
    expect(saveNickname('   ', storage)).toBe(true);
    expect(getNickname(storage)).toBeNull();
  });

  it('rejects non-string values without throwing, treating them as no nickname', () => {
    const storage = makeStorage();
    expect(saveNickname(null, storage)).toBe(true);
    expect(saveNickname(undefined, storage)).toBe(true);
    expect(saveNickname(42, storage)).toBe(true);
    expect(getNickname(storage)).toBeNull();
  });

  it('removes a stored nickname via clearNickname', () => {
    const storage = makeStorage();
    saveNickname('Rex', storage);
    expect(clearNickname(storage)).toBe(true);
    expect(getNickname(storage)).toBeNull();
  });

  it('clearNickname on an already-absent key still reports success', () => {
    const storage = makeStorage();
    expect(clearNickname(storage)).toBe(true);
  });

  it('returns null instead of throwing when the stored value is corrupted JSON', () => {
    const storage = makeStorage();
    storage.setItem(NICKNAME_STORAGE_KEY, '{not-json');
    expect(getNickname(storage)).toBeNull();
  });

  it('returns null when the stored value decodes to a non-string', () => {
    const storage = makeStorage();
    storage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify(42));
    expect(getNickname(storage)).toBeNull();
  });

  it('degrades to a no-op false/null when no storage is available at all', () => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
    try {
      expect(saveNickname('Rex', null)).toBe(false);
      expect(getNickname(null)).toBeNull();
      expect(clearNickname(null)).toBe(false);
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
      removeItem: () => {},
    };
    expect(saveNickname('Rex', storage)).toBe(false);
  });

  it('surfaces a throwing getItem as a null return instead of throwing', () => {
    const storage = {
      getItem: () => {
        throw new Error('boom');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(getNickname(storage)).toBeNull();
  });

  it('surfaces a throwing removeItem as a false return instead of throwing', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('boom');
      },
    };
    expect(clearNickname(storage)).toBe(false);
    // A blank save routes through clearNickname internally and must degrade the same way.
    expect(saveNickname('   ', storage)).toBe(false);
  });

  it('never calls console methods with the nickname value, on any path', () => {
    const consoleSpies = ['log', 'warn', 'error', 'info', 'debug'].map((method) =>
      jest.spyOn(console, method).mockImplementation(() => {})
    );
    try {
      const storage = makeStorage();
      const secretName = 'SuperSecretChildName123';

      saveNickname(secretName, storage);
      getNickname(storage);
      clearNickname(storage);

      // Also exercise the failure paths, which must stay silent too.
      const throwingStorage = {
        getItem: () => {
          throw new Error('boom');
        },
        setItem: () => {
          throw new Error('boom');
        },
        removeItem: () => {
          throw new Error('boom');
        },
      };
      saveNickname(secretName, throwingStorage);
      getNickname(throwingStorage);
      clearNickname(throwingStorage);

      for (const spy of consoleSpies) {
        for (const call of spy.mock.calls) {
          for (const arg of call) {
            expect(String(arg)).not.toContain(secretName);
          }
        }
        expect(spy).not.toHaveBeenCalled();
      }
    } finally {
      consoleSpies.forEach((spy) => spy.mockRestore());
    }
  });
});
