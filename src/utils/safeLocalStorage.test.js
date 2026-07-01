const safeLocalStorage = require('./safeLocalStorage');

describe('Safe LocalStorage Wrapper', () => {
  let store;
  let originalLocalStorage;

  beforeEach(() => {
    store = {};
    originalLocalStorage = global.localStorage;
    
    global.localStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = String(value); }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
    };
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    jest.clearAllMocks();
  });

  test('should set and get an item successfully', () => {
    safeLocalStorage.setItem('testKey', 'testValue');
    expect(safeLocalStorage.getItem('testKey')).toBe('testValue');
  });

  test('should return null for a non-existent item', () => {
    expect(safeLocalStorage.getItem('nonExistentKey')).toBeNull();
  });

  test('should remove an item successfully', () => {
    safeLocalStorage.setItem('testKey', 'testValue');
    safeLocalStorage.removeItem('testKey');
    expect(safeLocalStorage.getItem('testKey')).toBeNull();
  });

  test('should catch QuotaExceededError on setItem and not throw', () => {
    global.localStorage.setItem.mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => safeLocalStorage.setItem('testKey', 'testValue')).not.toThrow();
  });

  test('should catch SecurityError on setItem and not throw', () => {
    global.localStorage.setItem.mockImplementation(() => {
      throw new DOMException('Security error', 'SecurityError');
    });

    expect(() => safeLocalStorage.setItem('testKey', 'testValue')).not.toThrow();
  });

  test('should catch SecurityError on getItem and return null', () => {
    global.localStorage.getItem.mockImplementation(() => {
      throw new DOMException('Security error', 'SecurityError');
    });

    expect(() => safeLocalStorage.getItem('testKey')).not.toThrow();
    expect(safeLocalStorage.getItem('testKey')).toBeNull();
  });

  test('should catch SecurityError on removeItem and not throw', () => {
    global.localStorage.removeItem.mockImplementation(() => {
      throw new DOMException('Security error', 'SecurityError');
    });

    expect(() => safeLocalStorage.removeItem('testKey')).not.toThrow();
  });
});
