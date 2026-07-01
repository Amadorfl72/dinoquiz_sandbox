import { loadBestScore, updateBestScore, BEST_SCORE_KEY } from '../bestScore';

describe('TRIOFSND-48: Best score integration — close/reopen simulation', () => {
  let originalLocalStorage;
  let store;

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
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  it('Scenario 1: best score survives a simulated page reload', () => {
    // First session: play and set a best score
    const msgCb1 = jest.fn();
    updateBestScore(18, msgCb1);
    expect(msgCb1).toHaveBeenCalled();

    // Simulate page reload: create a fresh store snapshot
    const persisted = { ...store };
    store = {};
    Object.assign(store, persisted);

    // Second session: load should return the persisted best
    expect(loadBestScore()).toBe(18);
  });

  it('Scenario 2 then 3: new best shows message, tie does not', () => {
    const msgNewBest = jest.fn();
    const result1 = updateBestScore(12, msgNewBest);
    expect(result1.isNewBest).toBe(true);
    expect(msgNewBest).toHaveBeenCalled();

    const msgTie = jest.fn();
    const result2 = updateBestScore(12, msgTie);
    expect(result2.isNewBest).toBe(false);
    expect(msgTie).not.toHaveBeenCalled();

    expect(loadBestScore()).toBe(12);
  });

  it('Scenario 4: gracefully handles localStorage being removed mid-session', () => {
    // Start with working localStorage
    updateBestScore(5, jest.fn());
    expect(loadBestScore()).toBe(5);

    // Now simulate localStorage becoming unavailable
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError: Access denied');
      },
    });

    expect(() => loadBestScore()).not.toThrow();
    expect(() => updateBestScore(100, jest.fn())).not.toThrow();
    expect(loadBestScore()).toBe(0);
  });
});