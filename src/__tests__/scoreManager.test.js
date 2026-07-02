import { ScoreManager } from '../scoreManager';

describe('ScoreManager - best score persistence', () => {
  let scoreManager;
  const STORAGE_KEY = 'triofsnd_best_score';

  beforeEach(() => {
    localStorage.clear();
    scoreManager = new ScoreManager();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe('Scenario 1: Best score persists after close/reopen', () => {
    test('should retrieve the previously stored best score on re-instantiation', () => {
      scoreManager.setBestScore(1500);

      // Simulate close/reopen by creating a new instance
      const reopenedManager = new ScoreManager();

      expect(reopenedManager.getBestScore()).toBe(1500);
    });

    test('should persist best score in localStorage across instances', () => {
      scoreManager.setBestScore(3200);

      const rawStored = localStorage.getItem(STORAGE_KEY);
      expect(rawStored).not.toBeNull();
      expect(JSON.parse(rawStored)).toBe(3200);

      const reopenedManager = new ScoreManager();
      expect(reopenedManager.getBestScore()).toBe(3200);
    });

    test('should default to 0 when no best score has been stored', () => {
      const freshManager = new ScoreManager();
      expect(freshManager.getBestScore()).toBe(0);
    });

    test('should handle corrupted localStorage value gracefully and default to 0', () => {
      localStorage.setItem(STORAGE_KEY, 'not-a-number');

      const reopenedManager = new ScoreManager();
      expect(reopenedManager.getBestScore()).toBe(0);
    });
  });

  describe('Scenario 2: New best updates localStorage and shows message', () => {
    test('should update localStorage when a new best score is achieved', () => {
      scoreManager.setBestScore(1000);

      const result = scoreManager.submitScore(2500);

      expect(result.isNewBest).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toBe(2500);
    });

    test('should return isNewBest=true so UI can show the new best message', () => {
      scoreManager.setBestScore(500);

      const result = scoreManager.submitScore(800);

      expect(result.isNewBest).toBe(true);
      expect(result.score).toBe(800);
      expect(result.previousBest).toBe(500);
    });

    test('should update best score to the new higher value', () => {
      scoreManager.setBestScore(1000);

      scoreManager.submitScore(3000);

      expect(scoreManager.getBestScore()).toBe(3000);
    });

    test('should trigger onNewBest callback when a new best is set', () => {
      const callback = jest.fn();
      scoreManager.onNewBest = callback;
      scoreManager.setBestScore(200);

      scoreManager.submitScore(600);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(600, 200);
    });
  });

  describe('Scenario 3: Tie does not update or show message', () => {
    test('should not update localStorage when score equals current best', () => {
      scoreManager.setBestScore(1000);
      const storedBefore = localStorage.getItem(STORAGE_KEY);

      const result = scoreManager.submitScore(1000);

      expect(result.isNewBest).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(storedBefore);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toBe(1000);
    });

    test('should not trigger onNewBest callback on a tie', () => {
      const callback = jest.fn();
      scoreManager.onNewBest = callback;
      scoreManager.setBestScore(1000);

      scoreManager.submitScore(1000);

      expect(callback).not.toHaveBeenCalled();
    });

    test('should keep the same best score value after a tie', () => {
      scoreManager.setBestScore(1500);

      scoreManager.submitScore(1500);

      expect(scoreManager.getBestScore()).toBe(1500);
    });

    test('should not show new best message when score is lower than best', () => {
      scoreManager.setBestScore(2000);

      const result = scoreManager.submitScore(500);

      expect(result.isNewBest).toBe(false);
      expect(scoreManager.getBestScore()).toBe(2000);
    });
  });

  describe('Scenario 4: Disabled localStorage does not block game and shows no error', () => {
    let originalLocalStorage;

    beforeEach(() => {
      originalLocalStorage = window.localStorage;
      // Simulate disabled / unavailable localStorage by making all methods throw
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

    test('should not throw when constructing ScoreManager without localStorage', () => {
      expect(() => new ScoreManager()).not.toThrow();
    });

    test('should default best score to 0 when localStorage is unavailable', () => {
      const manager = new ScoreManager();
      expect(manager.getBestScore()).toBe(0);
    });

    test('should not throw when submitting a score without localStorage', () => {
      const manager = new ScoreManager();

      expect(() => manager.submitScore(9999)).not.toThrow();
    });

    test('should still report isNewBest=true for a score above default 0', () => {
      const manager = new ScoreManager();
      const result = manager.submitScore(500);

      expect(result.isNewBest).toBe(true);
      expect(result.score).toBe(500);
    });

    test('should not throw when calling setBestScore without localStorage', () => {
      const manager = new ScoreManager();

      expect(() => manager.setBestScore(1234)).not.toThrow();
    });

    test('should not expose any error to the caller when localStorage fails', () => {
      const manager = new ScoreManager();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      manager.setBestScore(5000);
      const result = manager.submitScore(6000);

      expect(result.isNewBest).toBe(true);
      // Game should continue functioning; no uncaught errors
      expect(manager.getBestScore()).toBe(6000);
      consoleSpy.mockRestore();
    });
  });
});
