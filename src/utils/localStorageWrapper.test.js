const { getItem, setItem, removeItem } = require('./localStorageWrapper');

describe('localStorageWrapper', () => {
  let mockLocalStorage;

  beforeEach(() => {
    mockLocalStorage = {
      store: {},
      getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
      setItem: jest.fn((key, value) => {
        mockLocalStorage.store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete mockLocalStorage.store[key];
      }),
      clear: jest.fn(() => {
        mockLocalStorage.store = {};
      }),
    };

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('setItem', () => {
    it('should successfully set an item', () => {
      setItem('testKey', 'testValue');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('testKey', 'testValue');
      expect(mockLocalStorage.store['testKey']).toBe('testValue');
    });

    it('should catch QuotaExceededError and not throw', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      expect(() => setItem('testKey', 'testValue')).not.toThrow();
    });

    it('should catch SecurityError and not throw', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new Error('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });
      
      expect(() => setItem('testKey', 'testValue')).not.toThrow();
    });

    it('should catch generic exceptions and not throw', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      expect(() => setItem('testKey', 'testValue')).not.toThrow();
    });
  });

  describe('getItem', () => {
    it('should successfully get an item', () => {
      mockLocalStorage.store['testKey'] = 'testValue';
      const result = getItem('testKey');
      expect(result).toBe('testValue');
    });

    it('should return null if item does not exist', () => {
      const result = getItem('nonExistentKey');
      expect(result).toBeNull();
    });

    it('should catch SecurityError and return null without throwing', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        const error = new Error('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });
      
      let result;
      expect(() => {
        result = getItem('testKey');
      }).not.toThrow();
      
      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should successfully remove an item', () => {
      mockLocalStorage.store['testKey'] = 'testValue';
      removeItem('testKey');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('testKey');
      expect(mockLocalStorage.store['testKey']).toBeUndefined();
    });

    it('should catch SecurityError and not throw', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        const error = new Error('SecurityError');
        error.name = 'SecurityError';
        throw error;
      });
      
      expect(() => removeItem('testKey')).not.toThrow();
    });
  });
});