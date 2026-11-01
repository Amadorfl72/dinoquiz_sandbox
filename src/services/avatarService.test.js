'use strict';

const { getAvatar, saveAvatar, clearAvatar, AVATAR_STORAGE_KEY } = require('./avatarService');
const { getNickname, saveNickname } = require('./nicknameService');

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

describe('avatarService — local player-avatar persistence', () => {
  it('returns null (no avatar) when nothing was ever saved', () => {
    const storage = makeStorage();
    expect(getAvatar(storage)).toBeNull();
  });

  it('round-trips an avatar id through the given storage adapter', () => {
    const storage = makeStorage();
    expect(saveAvatar('triceratops', storage)).toBe(true);
    expect(getAvatar(storage)).toBe('triceratops');
  });

  it('namespaces the key under dinoquiz.playerAvatar, independent of other keys', () => {
    const storage = makeStorage();
    saveAvatar('triceratops', storage);
    expect(AVATAR_STORAGE_KEY).toBe('dinoquiz.playerAvatar');
    expect(storage._store[AVATAR_STORAGE_KEY]).toBe(JSON.stringify('triceratops'));
  });

  it('saves and reads the avatar alongside the nickname without either clobbering the other', () => {
    const storage = makeStorage();
    expect(saveNickname('Rex', storage)).toBe(true);
    expect(saveAvatar('triceratops', storage)).toBe(true);

    expect(getNickname(storage)).toBe('Rex');
    expect(getAvatar(storage)).toBe('triceratops');
  });

  it('reads a nickname with no avatar previously saved, defaulting avatar to null without throwing', () => {
    const storage = makeStorage();
    saveNickname('Rex', storage);

    expect(getNickname(storage)).toBe('Rex');
    expect(getAvatar(storage)).toBeNull();
  });

  it('clearing the avatar leaves the nickname untouched', () => {
    const storage = makeStorage();
    saveNickname('Rex', storage);
    saveAvatar('triceratops', storage);

    expect(clearAvatar(storage)).toBe(true);

    expect(getAvatar(storage)).toBeNull();
    expect(getNickname(storage)).toBe('Rex');
  });

  it('overwrites a previously stored avatar id', () => {
    const storage = makeStorage();
    saveAvatar('triceratops', storage);
    saveAvatar('tiranosaurio', storage);
    expect(getAvatar(storage)).toBe('tiranosaurio');
  });

  it('trims surrounding whitespace before persisting and reading', () => {
    const storage = makeStorage();
    saveAvatar('  triceratops  ', storage);
    expect(storage._store[AVATAR_STORAGE_KEY]).toBe(JSON.stringify('triceratops'));
    expect(getAvatar(storage)).toBe('triceratops');
  });

  it('treats an empty or whitespace-only value as no avatar, never creating an empty entry', () => {
    const storage = makeStorage();
    expect(saveAvatar('', storage)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(storage._store, AVATAR_STORAGE_KEY)).toBe(false);

    expect(saveAvatar('   ', storage)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(storage._store, AVATAR_STORAGE_KEY)).toBe(false);
    expect(getAvatar(storage)).toBeNull();
  });

  it('rejects non-string values without throwing, treating them as no avatar', () => {
    const storage = makeStorage();
    expect(saveAvatar(null, storage)).toBe(true);
    expect(saveAvatar(undefined, storage)).toBe(true);
    expect(saveAvatar(42, storage)).toBe(true);
    expect(getAvatar(storage)).toBeNull();
  });

  it('removes a stored avatar via clearAvatar', () => {
    const storage = makeStorage();
    saveAvatar('triceratops', storage);
    expect(clearAvatar(storage)).toBe(true);
    expect(getAvatar(storage)).toBeNull();
  });

  it('clearAvatar on an already-absent key still reports success', () => {
    const storage = makeStorage();
    expect(clearAvatar(storage)).toBe(true);
  });

  it('returns null instead of throwing when the stored value is corrupted JSON', () => {
    const storage = makeStorage();
    storage.setItem(AVATAR_STORAGE_KEY, '{not-json');
    expect(getAvatar(storage)).toBeNull();
  });

  it('returns null when the stored value decodes to a non-string', () => {
    const storage = makeStorage();
    storage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(42));
    expect(getAvatar(storage)).toBeNull();
  });

  describe('tolerate-storage-failure pattern (AW8)', () => {
    it('degrades to a no-op false/null when no storage is available at all', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
      try {
        expect(saveAvatar('triceratops', null)).toBe(false);
        expect(getAvatar(null)).toBeNull();
        expect(clearAvatar(null)).toBe(false);
      } finally {
        Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, configurable: true });
      }
    });

    it('degrades to a no-op false/null when accessing window.localStorage itself throws', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('blocked');
        },
      });
      try {
        expect(getAvatar()).toBeNull();
        expect(saveAvatar('triceratops')).toBe(false);
        expect(clearAvatar()).toBe(false);
      } finally {
        Object.defineProperty(window, 'localStorage', originalDescriptor);
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
      expect(saveAvatar('triceratops', storage)).toBe(false);
    });

    it('surfaces a throwing getItem as a null return instead of throwing', () => {
      const storage = {
        getItem: () => {
          throw new Error('boom');
        },
        setItem: () => {},
        removeItem: () => {},
      };
      expect(getAvatar(storage)).toBeNull();
    });

    it('surfaces a throwing removeItem as a false return instead of throwing', () => {
      const storage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {
          throw new Error('boom');
        },
      };
      expect(clearAvatar(storage)).toBe(false);
      // A blank save routes through clearAvatar internally and must degrade the same way.
      expect(saveAvatar('   ', storage)).toBe(false);
    });
  });
});
