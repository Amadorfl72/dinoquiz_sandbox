import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBestScore,
  setBestScore,
  evaluateBestScore,
  STORAGE_KEYS,
} from './storage';

describe('storage utils', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('getBestScore', () => {
    it('returns 0 on first visit (empty localStorage)', () => {
      expect(getBestScore()).toBe(0);
    });

    it('returns the stored numeric value', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, '7');
      expect(getBestScore()).toBe(7);
    });

    it('returns 0 when stored value is non-numeric (tampered)', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, 'not-a-number');
      expect(getBestScore()).toBe(0);
    });

    it('returns 0 when stored value is NaN', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, 'NaN');
      expect(getBestScore()).toBe(0);
    });

    it('returns 0 when stored value is Infinity', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, 'Infinity');
      expect(getBestScore()).toBe(0);
    });

    it('returns 0 when stored value is negative', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, '-5');
      expect(getBestScore()).toBe(0);
    });

    it('floors fractional values', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, '7.9');
      expect(getBestScore()).toBe(7);
    });
  });

  describe('setBestScore', () => {
    it('persists a valid numeric score', () => {
      const ok = setBestScore(8);
      expect(ok).toBe(true);
      expect(window.localStorage.getItem(STORAGE_KEYS.BEST_SCORE)).toBe('8');
    });

    it('rejects non-numeric input', () => {
      expect(setBestScore('abc')).toBe(false);
      expect(setBestScore(NaN)).toBe(false);
      expect(setBestScore(Infinity)).toBe(false);
    });

    it('rejects negative values', () => {
      expect(setBestScore(-1)).toBe(false);
    });
  });

  describe('evaluateBestScore', () => {
    it('returns isNewBest=false on first visit (no previous record)', () => {
      const result = evaluateBestScore(5);
      expect(result.isNewBest).toBe(false);
      expect(result.shouldUpdate).toBe(true); // 5 > 0, so we should save
      expect(result.previousBest).toBe(0);
    });

    it('returns isNewBest=true when score exceeds a valid previous best', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, '6');
      const result = evaluateBestScore(8);
      expect(result.isNewBest).toBe(true);
      expect(result.shouldUpdate).toBe(true);
      expect(result.previousBest).toBe(6);
    });

    it('returns isNewBest=false when score equals previous best', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, '7');
      const result = evaluateBestScore(7);
      expect(result.isNewBest).toBe(false);
      expect(result.shouldUpdate).toBe(false);
      expect(result.previousBest).toBe(7);
    });

    it('returns isNewBest=false when score is lower than previous best', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, '8');
      const result = evaluateBestScore(3);
      expect(result.isNewBest).toBe(false);
      expect(result.shouldUpdate).toBe(false);
      expect(result.previousBest).toBe(8);
    });

    it('does NOT flag new best when previous value is corrupted', () => {
      window.localStorage.setItem(STORAGE_KEYS.BEST_SCORE, 'tampered');
      const result = evaluateBestScore(9);
      // Corrupted previous value is treated as 0, but since there WAS a
      // stored value (hasPrevious=true) yet parsed is not finite, isNewBest
      // must be false to avoid misleading the child.
      expect(result.isNewBest).toBe(false);
      expect(result.shouldUpdate).toBe(true); // 9 > 0, still save it
      expect(result.previousBest).toBe(0);
    });

    it('handles non-numeric score input gracefully', () => {
      const result = evaluateBestScore('not-a-number');
      expect(result.isNewBest).toBe(false);
      expect(result.shouldUpdate).toBe(false);
    });
  });

  describe('localStorage disabled', () => {
    it('getBestScore returns 0 when localStorage throws', () => {
      const original = window.localStorage.getItem;
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('disabled'); },
          setItem: () => { throw new Error('disabled'); },
          removeItem: () => {},
          clear: () => {},
        },
        configurable: true,
      });
      expect(getBestScore()).toBe(0);
      expect(setBestScore(5)).toBe(false);
      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: original,
          setItem: () => {},
          removeItem: () => {},
          clear: () => {},
        },
        configurable: true,
      });
    });
  });
});
