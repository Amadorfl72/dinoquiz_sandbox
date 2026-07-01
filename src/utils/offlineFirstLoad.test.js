import {
  isFirstTimeLoad,
  isOffline,
  shouldShowOfflineFirstLoadMessage,
} from './offlineFirstLoad';

describe('offlineFirstLoad detection logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isFirstTimeLoad', () => {
    it('returns true when no previous load flag exists in localStorage', () => {
      expect(isFirstTimeLoad()).toBe(true);
    });

    it('returns false when a previous load flag exists in localStorage', () => {
      localStorage.setItem('triofsnd:hasLoadedBefore', 'true');
      expect(isFirstTimeLoad()).toBe(false);
    });
  });

  describe('isOffline', () => {
    it('returns true when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      expect(isOffline()).toBe(true);
    });

    it('returns false when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      });
      expect(isOffline()).toBe(false);
    });
  });

  describe('shouldShowOfflineFirstLoadMessage', () => {
    it('returns true when it is the first time load and the device is offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      localStorage.clear();
      expect(shouldShowOfflineFirstLoadMessage()).toBe(true);
    });

    it('returns false when it is the first time load but the device is online', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      });
      localStorage.clear();
      expect(shouldShowOfflineFirstLoadMessage()).toBe(false);
    });

    it('returns false when the device is offline but it is not the first time load', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      localStorage.setItem('triofsnd:hasLoadedBefore', 'true');
      expect(shouldShowOfflineFirstLoadMessage()).toBe(false);
    });

    it('returns false when the device is online and it is not the first time load', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      });
      localStorage.setItem('triofsnd:hasLoadedBefore', 'true');
      expect(shouldShowOfflineFirstLoadMessage()).toBe(false);
    });

    it('does not throw technical errors when navigator.onLine is undefined', () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: undefined,
      });
      expect(() => shouldShowOfflineFirstLoadMessage()).not.toThrow();
    });

    it('does not throw technical errors when localStorage is unavailable', () => {
      const originalGetItem = localStorage.getItem;
      spyOn(localStorage, 'getItem').and.throwError('Storage unavailable');
      expect(() => shouldShowOfflineFirstLoadMessage()).not.toThrow();
      localStorage.getItem = originalGetItem;
    });
  });
});
