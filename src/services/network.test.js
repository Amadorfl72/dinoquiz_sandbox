'use strict';

const { isOnline } = require('./network');

describe('isOnline', () => {
  test('returns true when navigator.onLine is true', () => {
    expect(isOnline({ onLine: true })).toBe(true);
  });

  test('returns false when navigator.onLine is false', () => {
    expect(isOnline({ onLine: false })).toBe(false);
  });

  test('fails open (assumes connected) when no navigator-like object is given', () => {
    expect(isOnline(null)).toBe(true);
  });

  test('fails open (assumes connected) when onLine is not a boolean (unsupported browser)', () => {
    expect(isOnline({})).toBe(true);
  });

  test('defaults to the global navigator when no argument is given', () => {
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });

    try {
      expect(isOnline()).toBe(false);
    } finally {
      if (original) {
        Object.defineProperty(window.navigator, 'onLine', original);
      }
    }
  });
});
