import { loadBestScore, saveBestScore, isNewBestScore } from './bestScore';

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

  describe('loadBestScore', () => {
    it('returns the persisted best score when present', () => {
      localStorage.setItem('triofsnd:bestScore', '42');
      expect(loadBestScore()).toBe(42);
    });

    it('returns 0 when no best score is stored', () => {
      expect(loadBestScore()).toBe(0);
    });

    it('returns 0 when stored value is not a valid number', () => {
      localStorage.setItem('triofsnd:bestScore', 'not-a-number');
      expect(loadBestScore()).toBe(0);
    });

    it('returns 0 when localStorage throws on read', () => {
      localStorage.getItem = jest.fn(() => { throw new Error('QuotaExceeded'); });
      expect(loadBestScore()).toBe(0);
    });
  });

  describe('saveBestScore', () => {
    it('writes the score to localStorage under the expected key', () => {
      saveBestScore(99);
      expect(localStorage.setItem).toHaveBeenCalledWith('triofsnd:bestScore', '99');
      expect(loadBestScore()).toBe(99);
    });

    it('does not throw when localStorage.setItem fails', () => {
      localStorage.setItem = jest.fn(() => { throw new Error('SecurityError'); });
      expect(() => saveBestScore(50)).not.toThrow();
    });

    it('does not persist a negative score', () => {
      saveBestScore(-10);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('does not persist a non-finite score', () => {
      saveBestScore(NaN);
      saveBestScore(Infinity);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('isNewBestScore', () => {
    it('returns true when current score is greater than persisted best', () => {
      localStorage.setItem('triofsnd:bestScore', '30');
      expect(isNewBestScore(31)).toBe(true);
    });

    it('returns false when current score equals persisted best', () => {
      localStorage.setItem('triofsnd:bestScore', '30');
      expect(isNewBestScore(30)).toBe(false);
    });

    it('returns false when current score is less than persisted best', () => {
      localStorage.setItem('triofsnd:bestScore', '30');
      expect(isNewBestScore(29)).toBe(false);
    });

    it('returns true when no best score has been persisted yet', () => {
      expect(isNewBestScore(1)).toBe(true);
    });

    it('returns false for a non-positive current score', () => {
      expect(isNewBestScore(0)).toBe(false);
      expect(isNewBestScore(-5)).toBe(false);
    });
  });
});
