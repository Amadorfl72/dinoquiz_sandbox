import { getBestScore, saveBestScore, shouldUpdateBestScore } from './bestScoreService';

describe('bestScoreService', () => {
  describe('shouldUpdateBestScore', () => {
    it('returns true when new score is greater than current best', () => {
      expect(shouldUpdateBestScore(100, 80)).toBe(true);
    });

    it('returns false when new score is less than current best', () => {
      expect(shouldUpdateBestScore(50, 80)).toBe(false);
    });

    it('returns false when new score equals current best (tie)', () => {
      expect(shouldUpdateBestScore(80, 80)).toBe(false);
    });

    it('returns true when there is no current best score', () => {
      expect(shouldUpdateBestScore(10, null)).toBe(true);
      expect(shouldUpdateBestScore(10, undefined)).toBe(true);
    });

    it('returns false when new score is zero and no best exists', () => {
      expect(shouldUpdateBestScore(0, null)).toBe(false);
    });
  });

  describe('saveBestScore', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('persists the best score to localStorage', () => {
      saveBestScore(120);
      expect(localStorage.getItem('bestScore')).toBe('120');
    });

    it('overwrites a lower best score with a higher one', () => {
      localStorage.setItem('bestScore', '50');
      saveBestScore(100);
      expect(localStorage.getItem('bestScore')).toBe('100');
    });

    it('does not overwrite when the new score is a tie', () => {
      localStorage.setItem('bestScore', '100');
      saveBestScore(100);
      expect(localStorage.getItem('bestScore')).toBe('100');
    });

    it('does not overwrite when the new score is lower', () => {
      localStorage.setItem('bestScore', '100');
      saveBestScore(50);
      expect(localStorage.getItem('bestScore')).toBe('100');
    });

    it('throws a descriptive error when localStorage is unavailable', () => {
      const original = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        configurable: true,
      });

      expect(() => saveBestScore(100)).toThrow(/localStorage/);

      Object.defineProperty(global, 'localStorage', {
        value: original,
        configurable: true,
      });
    });

    it('throws a descriptive error when setItem fails', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveBestScore(100)).toThrow(/best score/);

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('getBestScore', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('returns the stored best score as a number', () => {
      localStorage.setItem('bestScore', '250');
      expect(getBestScore()).toBe(250);
    });

    it('returns null when no best score is stored', () => {
      expect(getBestScore()).toBeNull();
    });

    it('returns null when stored value is invalid', () => {
      localStorage.setItem('bestScore', 'not-a-number');
      expect(getBestScore()).toBeNull();
    });

    it('returns null when localStorage throws', () => {
      const original = global.localStorage;
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        configurable: true,
      });

      expect(getBestScore()).toBeNull();

      Object.defineProperty(global, 'localStorage', {
        value: original,
        configurable: true,
      });
    });
  });
});