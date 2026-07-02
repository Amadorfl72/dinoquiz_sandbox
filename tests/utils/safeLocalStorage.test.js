const safeLocalStorage = require('../../src/utils/safeLocalStorage');

describe('Safe LocalStorage Wrapper', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    const store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        for (const key in store) delete store[key];
      })
    };
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    jest.restoreAllMocks();
  });

  describe('setItem', () => {
    it('should set item successfully', () => {
      safeLocalStorage.setItem('testKey', 'testValue');
      expect(global.localStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
    });

    it('should catch QuotaExceededError and not throw', () => {
      const error = new Error('Quota exceeded');
      error.name = 'QuotaExceededError';
      global.localStorage.setItem.mockImplementation(() => { throw error; });
      
      expect(() => safeLocalStorage.setItem('testKey', 'testValue')).not.toThrow();
    });

    it('should catch SecurityError and not throw', () => {
      const error = new Error('Security error');
      error.name = 'SecurityError';
      global.localStorage.setItem.mockImplementation(() => { throw error; });
      
      expect(() => safeLocalStorage.setItem('testKey', 'testValue')).not.toThrow();
    });
  });

  describe('getItem', () => {
    it('should get item successfully', () => {
      global.localStorage.setItem('testKey', 'testValue');
      const result = safeLocalStorage.getItem('testKey');
      expect(result).toBe('testValue');
    });

    it('should return null if item does not exist', () => {
      const result = safeLocalStorage.getItem('nonExistentKey');
      expect(result).toBeNull();
    });

    it('should catch SecurityError and return null', () => {
      const error = new Error('Security error');
      error.name = 'SecurityError';
      global.localStorage.getItem.mockImplementation(() => { throw error; });
      
      const result = safeLocalStorage.getItem('testKey');
      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', () => {
      safeLocalStorage.removeItem('testKey');
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('should catch SecurityError and not throw', () => {
      const error = new Error('Security error');
      error.name = 'SecurityError';
      global.localStorage.removeItem.mockImplementation(() => { throw error; });
      
      expect(() => safeLocalStorage.removeItem('testKey')).not.toThrow();
    });
  });
});
