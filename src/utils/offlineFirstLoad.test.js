import { checkOfflineFirstLoad } from './offlineFirstLoad';

describe('checkOfflineFirstLoad - TRIOFSND-7', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when it is the first load and the device is offline', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    localStorage.removeItem('gameDownloaded');

    expect(checkOfflineFirstLoad()).toBe(true);
  });

  it('returns false when online on first load and marks the game as downloaded', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    localStorage.removeItem('gameDownloaded');

    expect(checkOfflineFirstLoad()).toBe(false);
    expect(localStorage.getItem('gameDownloaded')).toBe('true');
  });

  it('returns false when offline but the game is already downloaded', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    localStorage.setItem('gameDownloaded', 'true');

    expect(checkOfflineFirstLoad()).toBe(false);
  });

  it('does not throw technical errors when offline on first load', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    localStorage.removeItem('gameDownloaded');

    expect(() => checkOfflineFirstLoad()).not.toThrow();
  });

  it('does not mark the game as downloaded when offline on first load', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    localStorage.removeItem('gameDownloaded');

    checkOfflineFirstLoad();
    expect(localStorage.getItem('gameDownloaded')).toBeNull();
  });
});
