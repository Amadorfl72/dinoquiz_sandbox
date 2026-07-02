import { ScoreManager } from '../scoreManager';

/**
 * Integration tests that exercise the real ScoreManager with a real
 * (jsdom-provided) localStorage, simulating full close/reopen cycles.
 */
describe('ScoreManager integration - full persistence lifecycle', () => {
  const STORAGE_KEY = 'triofsnd_best_score';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('Scenario 1: best score survives a full close/reopen cycle', () => {
    // First session
    const session1 = new ScoreManager();
    expect(session1.getBestScore()).toBe(0);

    session1.submitScore(500);
    expect(session1.getBestScore()).toBe(500);

    // Simulate app close: drop the instance
    // Simulate app reopen: new instance reads from localStorage
    const session2 = new ScoreManager();
    expect(session2.getBestScore()).toBe(500);
  });

  test('Scenario 2: new best in a later session updates storage and is detectable', () => {
    // Session 1 establishes a best
    const session1 = new ScoreManager();
    session1.submitScore(1000);

    // Session 2 beats it
    const session2 = new ScoreManager();
    expect(session2.getBestScore()).toBe(1000);

    const result = session2.submitScore(2500);
    expect(result.isNewBest).toBe(true);
    expect(result.previousBest).toBe(1000);

    // Session 3 confirms persistence
    const session3 = new ScoreManager();
    expect(session3.getBestScore()).toBe(2500);
  });

  test('Scenario 3: tie across sessions does not update or flag new best', () => {
    const session1 = new ScoreManager();
    session1.submitScore(2000);

    const session2 = new ScoreManager();
    const result = session2.submitScore(2000);

    expect(result.isNewBest).toBe(false);
    expect(session2.getBestScore()).toBe(2000);

    // Confirm storage was not rewritten
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toBe(2000);
  });

  test('Scenario 4: game functions normally with localStorage disabled mid-lifecycle', () => {
    const manager = new ScoreManager();
    manager.submitScore(800);

    // Disable localStorage after initial load
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => { throw new Error('SecurityError'); },
        setItem: () => { throw new Error('SecurityError'); },
        removeItem: () => { throw new Error('SecurityError'); },
        clear: () => { throw new Error('SecurityError'); },
        key: () => { throw new Error('SecurityError'); },
        length: 0,
      },
    });

    try {
      // These should not throw even though localStorage is now broken
      expect(() => manager.submitScore(1500)).not.toThrow();
      expect(() => manager.getBestScore()).not.toThrow();
      expect(manager.getBestScore()).toBe(1500);
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: original,
      });
    }
  });
});
