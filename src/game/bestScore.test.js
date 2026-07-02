import { getBestScore, setBestScore, isNewBestScore } from '../utils/score';

describe('Best Score Persistence (TRIOFSND-33)', () => {
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

  describe('getBestScore', () => {
    it('returns the persisted best score when present', () => {
      localStorage.setItem('triofsnd:bestScore', JSON.stringify(42));
      expect(getBestScore()).toBe(42);
    });

    it('returns 0 when no best score is stored', () => {
      expect(getBestScore()).toBe(0);
    });

    it('returns 0 when stored value is not valid JSON', () => {
      localStorage.setItem('triofsnd:bestScore', 'not-a-number');
      expect(getBestScore()).toBe(0);
    });

    it('returns 0 when localStorage throws on read', () => {
      localStorage.getItem = jest.fn(() => { throw new Error('QuotaExceeded'); });
      expect(getBestScore()).toBe(0);
    });
  });

  describe('setBestScore', () => {
    it('writes the score to localStorage under the expected key', () => {
      setBestScore(99);
      expect(localStorage.setItem).toHaveBeenCalledWith('triofsnd:bestScore', '99');
      expect(getBestScore()).toBe(99);
    });

    it('does not throw when localStorage.setItem fails', () => {
      localStorage.setItem = jest.fn(() => { throw new Error('SecurityError'); });
      expect(() => setBestScore(50)).not.toThrow();
    });

    it('returns true when storage write succeeds', () => {
      expect(setBestScore(10)).toBe(true);
    });

    it('returns false when storage write fails', () => {
      localStorage.setItem = jest.fn(() => { throw new Error('QuotaExceeded'); });
      expect(setBestScore(10)).toBe(false);
    });
  });

  describe('isNewBestScore', () => {
    it('returns true when current score is greater than persisted best', () => {
      localStorage.setItem('triofsnd:bestScore', JSON.stringify(30));
      expect(isNewBestScore(31)).toBe(true);
    });

    it('returns false when current score equals persisted best', () => {
      localStorage.setItem('triofsnd:bestScore', JSON.stringify(30));
      expect(isNewBestScore(30)).toBe(false);
    });

    it('returns false when current score is less than persisted best', () => {
      localStorage.setItem('triofsnd:bestScore', JSON.stringify(30));
      expect(isNewBestScore(29)).toBe(false);
    });

    it('returns true when no best score has been persisted yet', () => {
      expect(isNewBestScore(1)).toBe(true);
    });

    it('returns false for a non-positive current score', () => {
      expect(isNewBestScore(0)).toBe(false);
      expect(isNewBestScore(-5)).toBe(false);
    });

    it('returns true for a positive score when localStorage is unavailable', () => {
      localStorage.getItem = jest.fn(() => { throw new Error('Unavailable'); });
      expect(isNewBestScore(5)).toBe(true);
    });
  });
});
