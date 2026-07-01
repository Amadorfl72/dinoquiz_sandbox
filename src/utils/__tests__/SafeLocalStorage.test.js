const { SafeLocalStorage } = require('../SafeLocalStorage');

describe('SafeLocalStorage', () => {
  let safeStorage;
  let mockLocalStorage;

  beforeEach(() => {
    mockLocalStorage = {
      store: {},
      getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
      setItem: jest.fn((key, value) => { mockLocalStorage.store[key] = String(value); }),
      removeItem: jest.fn((key) => { delete mockLocalStorage.store[key]; }),
      clear: jest.fn(() => { mockLocalStorage.store = {}; }),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    safeStorage = new SafeLocalStorage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should set item successfully', () => {
      safeStorage.setItem('key', 'value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key', 'value');
      expect(mockLocalStorage.store['key']).toBe('value');
    });

    it('should catch QuotaExceededError and not throw', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      });

      expect(() => safeStorage.setItem('key', 'value')).not.toThrow();
    });

    it('should catch SecurityError and not throw', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        const error = new DOMException('Access is denied for this document', 'SecurityError');
        throw error;
      });

      expect(() => safeStorage.setItem('key', 'value')).not.toThrow();
    });
  });

  describe('getItem', () => {
    it('should get item successfully', () => {
      mockLocalStorage.store['key'] = 'value';
      const result = safeStorage.getItem('key');
      expect(result).toBe('value');
    });

    it('should return null if item does not exist', () => {
      const result = safeStorage.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('should catch SecurityError and return null without throwing', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        const error = new DOMException('Access is denied for this document', 'SecurityError');
        throw error;
      });

      expect(() => safeStorage.getItem('key')).not.toThrow();
      expect(safeStorage.getItem('key')).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', () => {
      mockLocalStorage.store['key'] = 'value';
      safeStorage.removeItem('key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('key');
      expect(mockLocalStorage.store['key']).toBeUndefined();
    });

    it('should catch SecurityError and not throw', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        const error = new DOMException('Access is denied for this document', 'SecurityError');
        throw error;
      });

      expect(() => safeStorage.removeItem('key')).not.toThrow();
    });
  });
});