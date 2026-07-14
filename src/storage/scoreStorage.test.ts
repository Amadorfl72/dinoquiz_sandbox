import { describe, it, expect, beforeEach } from 'vitest';
import { getBestScore, getMaxStreak, recordGameResult } from './scoreStorage';

describe('scoreStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts with no history', () => {
    expect(getBestScore()).toBe(0);
    expect(getMaxStreak()).toBe(0);
  });

  it('stores the first game result as the new best', () => {
    const outcome = recordGameResult({ score: 5, maxStreak: 3 });

    expect(outcome).toEqual({
      bestScore: 5,
      maxStreak: 3,
      isNewBestScore: true,
      isNewMaxStreak: true,
    });
  });

  it('updates the best score when a higher score is reached (5 -> 8)', () => {
    recordGameResult({ score: 5, maxStreak: 2 });
    const outcome = recordGameResult({ score: 8, maxStreak: 2 });

    expect(outcome.bestScore).toBe(8);
    expect(outcome.isNewBestScore).toBe(true);
    expect(getBestScore()).toBe(8);
  });

  it('keeps the previous best score and streak when the new round is lower', () => {
    recordGameResult({ score: 8, maxStreak: 4 });
    const outcome = recordGameResult({ score: 3, maxStreak: 1 });

    expect(outcome.bestScore).toBe(8);
    expect(outcome.maxStreak).toBe(4);
    expect(outcome.isNewBestScore).toBe(false);
    expect(outcome.isNewMaxStreak).toBe(false);
    expect(getBestScore()).toBe(8);
    expect(getMaxStreak()).toBe(4);
  });

  it('tracks best score and max streak independently of each other', () => {
    recordGameResult({ score: 6, maxStreak: 5 });
    const outcome = recordGameResult({ score: 4, maxStreak: 9 });

    expect(outcome.bestScore).toBe(6);
    expect(outcome.isNewBestScore).toBe(false);
    expect(outcome.maxStreak).toBe(9);
    expect(outcome.isNewMaxStreak).toBe(true);
  });

  it('persists values across simulated app sessions (reopening the app)', () => {
    recordGameResult({ score: 7, maxStreak: 6 });

    // Fresh reads with no further writes simulate the app being closed
    // and reopened - values must come purely from storage, not memory.
    expect(getBestScore()).toBe(7);
    expect(getMaxStreak()).toBe(6);
  });

  it('recovers gracefully from corrupted stored data', () => {
    window.localStorage.setItem('dinoquiz:bestScore', 'not-json');
    window.localStorage.setItem('dinoquiz:maxStreak', 'also-not-json');

    expect(getBestScore()).toBe(0);
    expect(getMaxStreak()).toBe(0);
  });

  it('does not throw when localStorage writes fail (e.g. private mode)', () => {
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    expect(() => recordGameResult({ score: 5, maxStreak: 5 })).not.toThrow();

    window.localStorage.setItem = originalSetItem;
  });
});
