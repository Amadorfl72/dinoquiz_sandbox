import { safeLocalStorage } from './safeLocalStorage';

describe('safeLocalStorage', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  const mockLocalStorageWithError = (errorName) => {
    const error = new Error(errorName);
    error.name = errorName;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => { throw error; }),
        setItem: jest.fn(() => { throw error; }),
        removeItem: jest.fn(() => { throw error; }),
        clear: jest.fn(() => { throw error; }),
      },
      writable: true,
      configurable: true,
    });
  };

  describe('setItem', () => {
    it('should set item in localStorage successfully', () => {
      const spy = jest.spyOn(window.localStorage, 'setItem');
      const result = safeLocalStorage.setItem('testKey', 'testValue');
      expect(spy).toHaveBeenCalledWith('testKey', 'testValue');
      expect(result).toBe(true);
      expect(window.localStorage.getItem('testKey')).toBe('testValue');
    });

    it('should not throw on QuotaExceededError', () => {
      mockLocalStorageWithError('QuotaExceededError');
      expect(() => safeLocalStorage.setItem('testKey', 'testValue')).not.toThrow();
      expect(safeLocalStorage.setItem('testKey', 'testValue')).toBe(false);
    });

    it('should not throw on SecurityError (private mode)', () => {
      mockLocalStorageWithError('SecurityError');
      expect(() => safeLocalStorage.setItem('testKey', 'testValue')).not.toThrow();
      expect(safeLocalStorage.setItem('testKey', 'testValue')).toBe(false);
    });
  });

  describe('getItem', () => {
    it('should get item from localStorage successfully', () => {
      window.localStorage.setItem('testKey', 'testValue');
      expect(safeLocalStorage.getItem('testKey')).toBe('testValue');
    });

    it('should return null on SecurityError', () => {
      mockLocalStorageWithError('SecurityError');
      expect(safeLocalStorage.getItem('testKey')).toBeNull();
    });

    it('should return null on QuotaExceededError', () => {
      mockLocalStorageWithError('QuotaExceededError');
      expect(safeLocalStorage.getItem('testKey')).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove item from localStorage successfully', () => {
      window.localStorage.setItem('testKey', 'testValue');
      safeLocalStorage.removeItem('testKey');
      expect(window.localStorage.getItem('testKey')).toBeNull();
    });

    it('should not throw on SecurityError', () => {
      mockLocalStorageWithError('SecurityError');
      expect(() => safeLocalStorage.removeItem('testKey')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear localStorage successfully', () => {
      window.localStorage.setItem('testKey', 'testValue');
      safeLocalStorage.clear();
      expect(window.localStorage.getItem('testKey')).toBeNull();
    });

    it('should not throw on SecurityError', () => {
      mockLocalStorageWithError('SecurityError');
      expect(() => safeLocalStorage.clear()).not.toThrow();
    });
  });
});