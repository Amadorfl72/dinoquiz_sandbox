import storage from '../utils/storage';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

beforeAll(() => {
  global.localStorage = localStorageMock;
});

beforeEach(() => {
  localStorage.clear();
});

describe('storage utility', () => {
  test('get returns defaultValue when key does not exist', () => {
    const defaultValue = 0;
    const result = storage.get('nonexistent', defaultValue);
    expect(result).toBe(defaultValue);
  });

  test('get returns parsed value when key exists', () => {
    const testValue = { score: 8 };
    localStorage.setItem('testKey', JSON.stringify(testValue));
    const result = storage.get('testKey', 0);
    expect(result).toEqual(testValue);
  });

  test('get returns defaultValue on parsing error', () => {
    localStorage.setItem('invalidJson', '{invalid}');
    const defaultValue = 0;
    const result = storage.get('invalidJson', defaultValue);
    expect(result).toBe(defaultValue);
  });

  test('set stores stringified value', () => {
    const testValue = { score: 9 };
    const success = storage.set('testKey', testValue);
    expect(success).toBe(true);
    expect(localStorage.getItem('testKey')).toBe(JSON.stringify(testValue));
  });

  test('set returns false on storage error', () => {
    // Simulate storage quota exceeded
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => { throw new Error('Quota exceeded'); });
    
    const success = storage.set('testKey', {});
    expect(success).toBe(false);
    
    localStorage.setItem = originalSetItem;
  });
});