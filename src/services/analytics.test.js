'use strict';

const analytics = require('./analytics');

function createMemoryStorage() {
  const store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
  };
}

describe('src/services/analytics.js', () => {
  test('recordEvent starts a new counter at 1 and increments it on repeat calls', () => {
    const storage = createMemoryStorage();
    expect(analytics.recordEvent('mode_selected', storage)).toBe(1);
    expect(analytics.recordEvent('mode_selected', storage)).toBe(2);
    expect(analytics.getEventCount('mode_selected', storage)).toBe(2);
  });

  test('tracks each of the four mode-dispatch events under its own count', () => {
    const storage = createMemoryStorage();
    analytics.recordEvent('mode_selected', storage);
    analytics.recordEvent('match_started', storage);
    analytics.recordEvent('mode_blocked', storage);
    analytics.recordEvent('mode_dispatch_mismatch', storage);

    expect(analytics.getEventCounts(storage)).toEqual({
      mode_selected: 1,
      match_started: 1,
      mode_blocked: 1,
      mode_dispatch_mismatch: 1,
    });
  });

  test('getEventCount returns 0 for an event never recorded', () => {
    const storage = createMemoryStorage();
    expect(analytics.getEventCount('mode_dispatch_mismatch', storage)).toBe(0);
  });

  test('persists counts under the single dinoquiz:-namespaced STORAGE_KEY', () => {
    const storage = createMemoryStorage();
    analytics.recordEvent('match_started', storage);

    expect(analytics.STORAGE_KEY.startsWith('dinoquiz:')).toBe(true);
    expect(JSON.parse(storage.getItem(analytics.STORAGE_KEY))).toEqual({ match_started: 1 });
  });

  test('degrades to an in-memory fallback (never throws) when storage.setItem throws', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };

    expect(() => analytics.recordEvent('mode_blocked', storage)).not.toThrow();
    expect(analytics.getEventCount('mode_blocked', storage)).toBe(0);
  });

  test('resolves to window.localStorage when no storage adapter is given', () => {
    window.localStorage.clear();
    analytics.recordEvent('mode_selected');
    expect(JSON.parse(window.localStorage.getItem(analytics.STORAGE_KEY))).toEqual({ mode_selected: 1 });
  });

  test('recordEventDetail stores the mode_id/cause payload for an event, retrievable via getEventDetail', () => {
    const storage = createMemoryStorage();
    analytics.recordEventDetail('mode_selected', { mode_id: 'quiz' }, storage);
    analytics.recordEventDetail('mode_blocked', { mode_id: 'parejas', cause: 'renderer_missing' }, storage);

    expect(analytics.getEventDetail('mode_selected', storage)).toEqual({ mode_id: 'quiz' });
    expect(analytics.getEventDetail('mode_blocked', storage)).toEqual({ mode_id: 'parejas', cause: 'renderer_missing' });
  });

  test('recordEventDetail keeps only the most recent payload per event name', () => {
    const storage = createMemoryStorage();
    analytics.recordEventDetail('mode_selected', { mode_id: 'quiz' }, storage);
    analytics.recordEventDetail('mode_selected', { mode_id: 'laberinto' }, storage);

    expect(analytics.getEventDetail('mode_selected', storage)).toEqual({ mode_id: 'laberinto' });
  });

  test('getEventDetail returns null for an event whose detail was never recorded', () => {
    const storage = createMemoryStorage();
    expect(analytics.getEventDetail('mode_dispatch_mismatch', storage)).toBeNull();
  });

  test('recordEventDetail is a no-op for a falsy or non-object detail, and never throws', () => {
    const storage = createMemoryStorage();
    expect(() => analytics.recordEventDetail('mode_selected', null, storage)).not.toThrow();
    expect(() => analytics.recordEventDetail('mode_selected', 'quiz', storage)).not.toThrow();
    expect(analytics.getEventDetail('mode_selected', storage)).toBeNull();
  });

  test('recordEventDetail persists under its own dinoquiz:-namespaced key, degrading to memory when storage.setItem throws', () => {
    expect(analytics.DETAILS_STORAGE_KEY.startsWith('dinoquiz:')).toBe(true);

    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(() => analytics.recordEventDetail('mode_blocked', { mode_id: 'x' }, storage)).not.toThrow();
  });
});
