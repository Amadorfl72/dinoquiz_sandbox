const ScoreManager = require('../scoreManager');

describe('ScoreManager - Best Score Comparison and Update Logic', () => {
  let scoreManager;

  beforeEach(() => {
    // Mock localStorage for persistence testing
    global.localStorage = {
      store: {},
      getItem: function(key) {
        return this.store[key] || null;
      },
      setItem: function(key, value) {
        this.store[key] = value.toString();
      },
      clear: function() {
        this.store = {};
      }
    };
    localStorage.clear();
    scoreManager = new ScoreManager();
  });

  afterEach(() => {
    delete global.localStorage;
  });

  test('should initialize best score to 0', () => {
    expect(scoreManager.getBestScore()).toBe(0);
  });

  test('should update best score when a new higher score is submitted', () => {
    scoreManager.updateBestScore(100);
    expect(scoreManager.getBestScore()).toBe(100);

    scoreManager.updateBestScore(150);
    expect(scoreManager.getBestScore()).toBe(150);
  });

  test('should not update best score when a new lower score is submitted', () => {
    scoreManager.updateBestScore(200);
    expect(scoreManager.getBestScore()).toBe(200);

    scoreManager.updateBestScore(50);
    expect(scoreManager.getBestScore()).toBe(200);
  });

  test('should not update best score when a new score is equal to the current best score', () => {
    scoreManager.updateBestScore(300);
    expect(scoreManager.getBestScore()).toBe(300);

    scoreManager.updateBestScore(300);
    expect(scoreManager.getBestScore()).toBe(300);
  });

  test('should persist best score across instances', () => {
    scoreManager.updateBestScore(500);
    
    const newScoreManagerInstance = new ScoreManager();
    expect(newScoreManagerInstance.getBestScore()).toBe(500);
  });

  test('should handle negative scores correctly (assuming higher is better)', () => {
    scoreManager.updateBestScore(-10);
    expect(scoreManager.getBestScore()).toBe(0);
    
    scoreManager.updateBestScore(10);
    expect(scoreManager.getBestScore()).toBe(10);
  });
});