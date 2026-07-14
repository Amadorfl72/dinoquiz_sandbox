import { getProgress, getDiscoveredCount, markFactSeen, recordGameResult } from './progressStorage';

const STORAGE_KEY = 'dinoquiz:progress:v1';

describe('progressStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default state when nothing is stored', () => {
    expect(getProgress()).toEqual({ seenFactIds: [], bestScore: 0, maxStreak: 0 });
  });

  it('records a newly seen fact without duplicating it', () => {
    markFactSeen('trex-teeth');
    markFactSeen('trex-teeth');
    const progress = markFactSeen('triceratops-horns');

    expect(progress.seenFactIds).toEqual(['trex-teeth', 'triceratops-horns']);
    expect(getDiscoveredCount()).toBe(2);
  });

  it('keeps the highest score and streak across games', () => {
    recordGameResult({ score: 6, streak: 3 });
    const progress = recordGameResult({ score: 4, streak: 5 });

    expect(progress.bestScore).toBe(6);
    expect(progress.maxStreak).toBe(5);
  });

  it('falls back to defaults when stored data is corrupted', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not-json');
    expect(getProgress()).toEqual({ seenFactIds: [], bestScore: 0, maxStreak: 0 });
  });

  it('falls back to defaults when stored data has the wrong shape', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ seenFactIds: 'not-an-array', bestScore: 1, maxStreak: 1 }));
    expect(getProgress()).toEqual({ seenFactIds: [], bestScore: 0, maxStreak: 0 });
  });

  it('persists state across reads, simulating an app reopen', () => {
    markFactSeen('stegosaurus-plates');
    recordGameResult({ score: 8, streak: 4 });

    const reopened = getProgress();
    expect(reopened.seenFactIds).toContain('stegosaurus-plates');
    expect(reopened.bestScore).toBe(8);
    expect(reopened.maxStreak).toBe(4);
  });
});
