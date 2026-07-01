const ScoreManager = require('../src/scoreManager');

describe('TRIOFSND-44: Best score comparison and update logic', () => {
  let scoreManager;

  beforeEach(() => {
    scoreManager = new ScoreManager();
  });

  test('should update best score when current score is strictly higher', () => {
    scoreManager.bestScore = 100;
    scoreManager.updateBestScore(150);
    expect(scoreManager.bestScore).toBe(150);
  });

  test('should not update best score when current score is lower', () => {
    scoreManager.bestScore = 200;
    scoreManager.updateBestScore(150);
    expect(scoreManager.bestScore).toBe(200);
  });

  test('should not update best score when current score is equal', () => {
    scoreManager.bestScore = 100;
    scoreManager.updateBestScore(100);
    expect(scoreManager.bestScore).toBe(100);
  });

  test('should initialize and update best score when it is null or undefined', () => {
    scoreManager.bestScore = null;
    scoreManager.updateBestScore(50);
    expect(scoreManager.bestScore).toBe(50);
  });

  test('should update best score from zero to a positive score', () => {
    scoreManager.bestScore = 0;
    scoreManager.updateBestScore(10);
    expect(scoreManager.bestScore).toBe(10);
  });

  test('should ignore negative scores and not update best score', () => {
    scoreManager.bestScore = 50;
    scoreManager.updateBestScore(-10);
    expect(scoreManager.bestScore).toBe(50);
  });

  test('should not set best score to a negative value if best score is 0', () => {
    scoreManager.bestScore = 0;
    scoreManager.updateBestScore(-5);
    expect(scoreManager.bestScore).toBe(0);
  });
});