const { ScoreManager } = require('./scoreManager');

describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  let scoreManager;
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = (() => {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; })
      };
    })();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    scoreManager = new ScoreManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1) Best score persists after close/reopen', () => {
    scoreManager.saveBestScore(150);
    
    // Simulate close/reopen by creating a new instance
    const newScoreManager = new ScoreManager();
    const bestScore = newScoreManager.getBestScore();
    
    expect(bestScore).toBe(150);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('bestScore');
  });

  test('2) New best updates localStorage and shows message', () => {
    scoreManager.saveBestScore(100);
    
    const result = scoreManager.checkAndSaveScore(150);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('bestScore', '150');
    expect(result.isNewBest).toBe(true);
    expect(result.message).toBe('New Best Score!');
  });

  test('3) Tie does not update or show message', () => {
    scoreManager.saveBestScore(100);
    
    const result = scoreManager.checkAndSaveScore(100);
    
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('bestScore', '100');
    expect(result.isNewBest).toBe(false);
    expect(result.message).toBe('');
  });

  test('4) Disabled localStorage doesn\'t block game and shows no error', () => {
    // Simulate disabled localStorage (e.g., Safari private mode)
    Object.defineProperty(window, 'localStorage', {
      value: null,
      writable: true
    });

    const disabledScoreManager = new ScoreManager();
    
    // Should not throw an error
    expect(() => {
      const result = disabledScoreManager.checkAndSaveScore(150);
      expect(result.isNewBest).toBe(true); // Still considered a new best in memory
      expect(result.message).toBe('New Best Score!');
    }).not.toThrow();
  });
});