import { storage } from './storage';

describe('Storage Wrapper (TRIOFSND-33)', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    const store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] ?? null),
      setItem: jest.fn((key, value) => { store[key] = String(value); }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
    };
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    jest.restoreAllMocks();
  });

  describe('storage.get', () => {
    it('returns the parsed value when key exists', () => {
      localStorage.setItem('test:key', JSON.stringify(42));
      expect(storage.get('test:key', 0)).toBe(42);
    });

    it('returns the default value when key does not exist', () => {
      expect(storage.get('missing:key', 'default')).toBe('default');
    });

    it('returns null default when no default is provided and key is missing', () => {
      expect(storage.get('missing:key', null)).toBeNull();
    });

    it('returns the default value when localStorage.getItem throws', () => {
      localStorage.getItem = jest.fn(() => { throw new Error('Unavailable'); });
      expect(storage.get('test:key', 'fallback')).toBe('fallback');
    });

    it('returns the default value when stored value is not valid JSON', () => {
      localStorage.setItem('test:key', 'not-valid-json');
      expect(storage.get('test:key', 0)).toBe(0);
    });

    it('handles complex JSON values', () => {
      localStorage.setItem('test:obj', JSON.stringify({ a: 1, b: 'hello' }));
      expect(storage.get('test:obj', null)).toEqual({ a: 1, b: 'hello' });
    });

    it('handles array values', () => {
      localStorage.setItem('test:arr', JSON.stringify([1, 2, 3]));
      expect(storage.get('test:arr', [])).toEqual([1, 2, 3]);
    });

    it('handles boolean values', () => {
      localStorage.setItem('test:bool', JSON.stringify(true));
      expect(storage.get('test:bool', false)).toBe(true);
    });
  });

  describe('storage.set', () => {
    it('writes JSON-stringified value to localStorage', () => {
      storage.set('test:key', 42);
      expect(localStorage.setItem).toHaveBeenCalledWith('test:key', '42');
    });

    it('writes stringified object to localStorage', () => {
      storage.set('test:key', { a: 1 });
      expect(localStorage.setItem).toHaveBeenCalledWith('test:key', '{"a":1}');
    });

    it('returns true on success', () => {
      expect(storage.set('test:key', 'value')).toBe(true);
    });

    it('returns false when localStorage.setItem throws', () => {
      localStorage.setItem = jest.fn(() => { throw new Error('QuotaExceeded'); });
      expect(storage.set('test:key', 'value')).toBe(false);
    });

    it('does not throw when localStorage.setItem fails', () => {
      localStorage.setItem = jest.fn(() => { throw new Error('SecurityError'); });
      expect(() => storage.set('test:key', 'value')).not.toThrow();
    });

    it('round-trips a value through set and get', () => {
      storage.set('test:key', 123);
      expect(storage.get('test:key', 0)).toBe(123);
    });
  });
});
