'use strict';

const {
  getSwVersion,
  setSwVersion,
  getLastPreloadAt,
  setLastPreloadAt,
  recordPrecacheComplete,
  SW_VERSION_STORAGE_KEY,
  LAST_PRELOAD_AT_STORAGE_KEY,
} = require('./offlineStatus');

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

function makeThrowingStorage() {
  return {
    getItem: () => {
      throw new Error('storage unavailable');
    },
    setItem: () => {
      throw new Error('storage unavailable');
    },
  };
}

describe('offlineStatus — namespaced keys', () => {
  it('namespaces both keys under dinoquiz:', () => {
    expect(SW_VERSION_STORAGE_KEY).toBe('dinoquiz:swVersion');
    expect(LAST_PRELOAD_AT_STORAGE_KEY).toBe('dinoquiz:lastPreloadAt');
  });
});

describe('offlineStatus — swVersion', () => {
  it('returns null when nothing was ever recorded', () => {
    const storage = makeStorage();
    expect(getSwVersion(storage)).toBeNull();
  });

  it('round-trips a version string through the given storage adapter', () => {
    const storage = makeStorage();
    expect(setSwVersion('v33', storage)).toBe(true);
    expect(getSwVersion(storage)).toBe('v33');
    expect(storage._store[SW_VERSION_STORAGE_KEY]).toBe(JSON.stringify('v33'));
  });

  it('overwrites a previously stored version', () => {
    const storage = makeStorage();
    setSwVersion('v32', storage);
    setSwVersion('v33', storage);
    expect(getSwVersion(storage)).toBe('v33');
  });

  it('rejects non-string or empty versions without throwing', () => {
    const storage = makeStorage();
    expect(setSwVersion('', storage)).toBe(false);
    expect(setSwVersion(null, storage)).toBe(false);
    expect(setSwVersion(undefined, storage)).toBe(false);
    expect(setSwVersion(33, storage)).toBe(false);
    expect(getSwVersion(storage)).toBeNull();
  });

  it('returns null instead of throwing when the stored value is corrupted JSON', () => {
    const storage = makeStorage();
    storage.setItem(SW_VERSION_STORAGE_KEY, '{not-json');
    expect(getSwVersion(storage)).toBeNull();
  });

  it('returns false/null instead of throwing when storage throws', () => {
    const storage = makeThrowingStorage();
    expect(setSwVersion('v33', storage)).toBe(false);
    expect(getSwVersion(storage)).toBeNull();
  });
});

describe('offlineStatus — lastPreloadAt', () => {
  it('returns null when nothing was ever recorded', () => {
    const storage = makeStorage();
    expect(getLastPreloadAt(storage)).toBeNull();
  });

  it('round-trips an ISO timestamp through the given storage adapter', () => {
    const storage = makeStorage();
    const iso = '2026-08-29T10:00:00.000Z';
    expect(setLastPreloadAt(iso, storage)).toBe(true);
    expect(getLastPreloadAt(storage)).toBe(iso);
  });

  it('returns false/null instead of throwing when storage throws', () => {
    const storage = makeThrowingStorage();
    expect(setLastPreloadAt('2026-08-29T10:00:00.000Z', storage)).toBe(false);
    expect(getLastPreloadAt(storage)).toBeNull();
  });
});

describe('offlineStatus — recordPrecacheComplete', () => {
  it('stamps both the swVersion and lastPreloadAt keys together', () => {
    const storage = makeStorage();
    const fixedNow = () => '2026-08-29T10:00:00.000Z';

    expect(recordPrecacheComplete('v33', storage, fixedNow)).toBe(true);
    expect(getSwVersion(storage)).toBe('v33');
    expect(getLastPreloadAt(storage)).toBe('2026-08-29T10:00:00.000Z');
  });

  it('overwrites both keys on a later precache completion', () => {
    const storage = makeStorage();
    recordPrecacheComplete('v33', storage, () => '2026-08-29T10:00:00.000Z');
    recordPrecacheComplete('v34', storage, () => '2026-08-30T09:00:00.000Z');

    expect(getSwVersion(storage)).toBe('v34');
    expect(getLastPreloadAt(storage)).toBe('2026-08-30T09:00:00.000Z');
  });

  it('rejects a missing/empty version without writing anything', () => {
    const storage = makeStorage();
    expect(recordPrecacheComplete('', storage, () => '2026-08-29T10:00:00.000Z')).toBe(false);
    expect(recordPrecacheComplete(null, storage, () => '2026-08-29T10:00:00.000Z')).toBe(false);
    expect(getSwVersion(storage)).toBeNull();
    expect(getLastPreloadAt(storage)).toBeNull();
  });

  it('defaults to the real clock (ISO-8601 string) when no now() override is given', () => {
    const storage = makeStorage();
    recordPrecacheComplete('v33', storage);
    const stamped = getLastPreloadAt(storage);
    expect(typeof stamped).toBe('string');
    expect(() => new Date(stamped).toISOString()).not.toThrow();
    expect(new Date(stamped).toISOString()).toBe(stamped);
  });

  it('never throws when storage is unavailable', () => {
    const storage = makeThrowingStorage();
    expect(recordPrecacheComplete('v33', storage, () => '2026-08-29T10:00:00.000Z')).toBe(false);
  });
});
