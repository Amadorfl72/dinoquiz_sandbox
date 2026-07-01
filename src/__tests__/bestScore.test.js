import {
  loadBestScore,
  saveBestScore,
  updateBestScore,
  BEST_SCORE_KEY,
} from '../bestScore';

describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  let originalLocalStorage;
  let store;
  let messageSpy;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    store = {};
    global.localStorage = {
      getItem: jest.fn((key) => (key in store ? store[key] : null)),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    };
    messageSpy = jest.fn();
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    jest.restoreAllMocks();
  });

  // Scenario 1: Best score persists after close/reopen
  describe('Scenario 1: Best score persists after close/reopen', () => {
    it('returns the previously saved best score on subsequent load', () => {
      saveBestScore(42);

      // Simulate close/reopen by re-reading from localStorage
      const result = loadBestScore();

      expect(result).toBe(42);
      expect(localStorage.getItem).toHaveBeenCalledWith(BEST_SCORE_KEY);
    });

    it('returns null/0 when no best score has been saved yet', () => {
      const result = loadBestScore();

      expect(result).toBe(0);
    });

    it('persists across multiple save/load cycles', () => {
      saveBestScore(10);
      expect(loadBestScore()).toBe(10);

      saveBestScore(25);
      expect(loadBestScore()).toBe(25);

      // Simulate full reload
      store = JSON.parse(JSON.stringify(store));
      expect(loadBestScore()).toBe(25);
    });
  });

  // Scenario 2: New best updates localStorage and shows message
  describe('Scenario 2: New best updates localStorage and shows message', () => {
    it('updates localStorage and calls message callback when a new best is achieved', () => {
      saveBestScore(15);

      const { isNewBest, previousBest } = updateBestScore(30, messageSpy);

      expect(isNewBest).toBe(true);
      expect(previousBest).toBe(15);
      expect(localStorage.setItem).toHaveBeenCalledWith(BEST_SCORE_KEY, '30');
      expect(messageSpy).toHaveBeenCalledWith(
        expect.stringContaining('New best'),
      );
    });

    it('shows message on first ever score (no prior best)', () => {
      const { isNewBest } = updateBestScore(7, messageSpy);

      expect(isNewBest).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(BEST_SCORE_KEY, '7');
      expect(messageSpy).toHaveBeenCalled();
    });

    it('persists the new best score to localStorage', () => {
      updateBestScore(50, messageSpy);

      expect(loadBestScore()).toBe(50);
    });
  });

  // Scenario 3: Tie does not update or show message
  describe('Scenario 3: Tie does not update or show message', () => {
    it('does not update localStorage or show message when score ties best', () => {
      saveBestScore(20);

      const { isNewBest } = updateBestScore(20, messageSpy);

      expect(isNewBest).toBe(false);
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        BEST_SCORE_KEY,
        '20',
      );
      expect(messageSpy).not.toHaveBeenCalled();
    });

    it('does not update localStorage or show message when score is lower than best', () => {
      saveBestScore(30);

      const { isNewBest } = updateBestScore(10, messageSpy);

      expect(isNewBest).toBe(false);
      expect(messageSpy).not.toHaveBeenCalled();
      expect(loadBestScore()).toBe(30);
    });

    it('keeps the existing best score unchanged after a tie', () => {
      saveBestScore(25);

      updateBestScore(25, messageSpy);

      expect(loadBestScore()).toBe(25);
    });
  });

  // Scenario 4: Disabled localStorage doesn't block game and shows no error
  describe('Scenario 4: Disabled localStorage does not block game', () => {
    beforeEach(() => {
      // Simulate disabled / unavailable localStorage
      Object.defineProperty(global, 'localStorage', {
        configurable: true,
        get: () => {
          throw new Error('localStorage is not available');
        },
      });
    });

    afterEach(() => {
      global.localStorage = originalLocalStorage;
    });

    it('loadBestScore returns 0 without throwing when localStorage is unavailable', () => {
      expect(() => loadBestScore()).not.toThrow();
      expect(loadBestScore()).toBe(0);
    });

    it('saveBestScore does not throw when localStorage is unavailable', () => {
      expect(() => saveBestScore(99)).not.toThrow();
    });

    it('updateBestScore does not throw and does not call message callback', () => {
      expect(() => updateBestScore(99, messageSpy)).not.toThrow();
      expect(messageSpy).not.toHaveBeenCalled();
    });

    it('updateBestScore still reports isNewBest as false when storage is unavailable', () => {
      const { isNewBest } = updateBestScore(99, messageSpy);
      expect(isNewBest).toBe(false);
    });
  });
});
