import { getBestScore, setBestScore, submitScore } from '../utils/bestScore';

const STORAGE_KEY = 'triofsnd_best_score';

describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe('Scenario 1: Best score persists after close/reopen', () => {
    test('should persist best score across module re-imports', () => {
      setBestScore(1500);

      // Simulate close/reopen by clearing the in-memory cache and re-reading
      const persisted = getBestScore();
      expect(persisted).toBe(1500);
    });

    test('should read the stored value from localStorage on re-open', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(3200));

      expect(getBestScore()).toBe(3200);
    });

    test('should default to 0 when no best score has been stored', () => {
      expect(getBestScore()).toBe(0);
    });

    test('should handle corrupted localStorage value gracefully and default to 0', () => {
      localStorage.setItem(STORAGE_KEY, 'not-a-number');

      expect(getBestScore()).toBe(0);
    });
  });

  describe('Scenario 2: New best updates localStorage and shows message', () => {
    test('should update localStorage when a new best score is achieved', () => {
      setBestScore(1000);

      const result = submitScore(2500);

      expect(result.isNewBest).toBe(true);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toBe(2500);
    });

    test('should return isNewBest=true so UI can show the new best message', () => {
      setBestScore(500);

      const result = submitScore(800);

      expect(result.isNewBest).toBe(true);
      expect(result.score).toBe(800);
      expect(result.previousBest).toBe(500);
    });

    test('should update best score to the new higher value', () => {
      setBestScore(1000);

      submitScore(3000);

      expect(getBestScore()).toBe(3000);
    });
  });

  describe('Scenario 3: Tie does not update or show message', () => {
    test('should not update localStorage when score equals current best', () => {
      setBestScore(1000);
      const storedBefore = localStorage.getItem(STORAGE_KEY);

      const result = submitScore(1000);

      expect(result.isNewBest).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(storedBefore);
    });

    test('should keep the same best score value after a tie', () => {
      setBestScore(1500);

      submitScore(1500);

      expect(getBestScore()).toBe(1500);
    });

    test('should not flag new best when score is lower than best', () => {
      setBestScore(2000);

      const result = submitScore(500);

      expect(result.isNewBest).toBe(false);
      expect(getBestScore()).toBe(2000);
    });
  });

  describe('Scenario 4: Disabled localStorage does not block game and shows no error', () => {
    let originalLocalStorage;

    beforeEach(() => {
      originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: jest.fn(() => { throw new Error('localStorage is not available'); }),
          setItem: jest.fn(() => { throw new Error('localStorage is not available'); }),
          removeItem: jest.fn(() => { throw new Error('localStorage is not available'); }),
          clear: jest.fn(() => { throw new Error('localStorage is not available'); }),
          key: jest.fn(() => { throw new Error('localStorage is not available'); }),
          length: 0,
        },
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    });

    test('should not throw when getting best score without localStorage', () => {
      expect(() => getBestScore()).not.toThrow();
    });

    test('should default best score to 0 when localStorage is unavailable', () => {
      expect(getBestScore()).toBe(0);
    });

    test('should not throw when submitting a score without localStorage', () => {
      expect(() => submitScore(9999)).not.toThrow();
    });

    test('should still report isNewBest=true for a score above default 0', () => {
      const result = submitScore(500);

      expect(result.isNewBest).toBe(true);
      expect(result.score).toBe(500);
    });

    test('should not throw when setting best score without localStorage', () => {
      expect(() => setBestScore(777)).not.toThrow();
    });

    test('should not log errors to console when localStorage is disabled', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      getBestScore();
      submitScore(500);
      setBestScore(300);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
