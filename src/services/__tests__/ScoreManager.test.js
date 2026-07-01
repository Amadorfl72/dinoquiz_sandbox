const ScoreManager = require('../ScoreManager');

describe('ScoreManager - Best Score Persistence and Error Scenarios (TRIOFSND-48)', () => {
  let scoreManager;
  let mockStorage;
  let mockUICallback;

  beforeEach(() => {
    mockStorage = {
      store: {},
      getItem: jest.fn((key) => mockStorage.store[key] || null),
      setItem: jest.fn((key, value) => { mockStorage.store[key] = value; }),
    };
    
    mockUICallback = jest.fn();
    scoreManager = new ScoreManager(mockStorage, mockUICallback);
  });

  describe('Tie score scenarios', () => {
    it('should not update best score when the new score is a tie', () => {
      const currentBest = 100;
      mockStorage.setItem('bestScore', currentBest);
      scoreManager.loadBestScore();

      scoreManager.submitScore(currentBest);

      expect(mockStorage.setItem).not.toHaveBeenCalledWith('bestScore', currentBest);
      expect(scoreManager.getBestScore()).toBe(currentBest);
    });

    it('should not show new best score message when the new score is a tie', () => {
      const currentBest = 100;
      mockStorage.setItem('bestScore', currentBest);
      scoreManager.loadBestScore();

      scoreManager.submitScore(currentBest);

      expect(mockUICallback).not.toHaveBeenCalledWith('showNewBestScoreMessage', true);
      expect(mockUICallback).not.toHaveBeenCalledWith(expect.stringContaining('best'), true);
    });
  });

  describe('Higher score scenarios', () => {
    it('should update best score when the new score is higher', () => {
      const currentBest = 100;
      const newScore = 150;
      mockStorage.setItem('bestScore', currentBest);
      scoreManager.loadBestScore();

      scoreManager.submitScore(newScore);

      expect(mockStorage.setItem).toHaveBeenCalledWith('bestScore', newScore);
      expect(scoreManager.getBestScore()).toBe(newScore);
    });

    it('should show new best score message when the new score is higher', () => {
      const currentBest = 100;
      const newScore = 150;
      mockStorage.setItem('bestScore', currentBest);
      scoreManager.loadBestScore();

      scoreManager.submitScore(newScore);

      expect(mockUICallback).toHaveBeenCalledWith('showNewBestScoreMessage', true);
    });
  });

  describe('Lower score scenarios', () => {
    it('should not update best score when the new score is lower', () => {
      const currentBest = 100;
      const newScore = 50;
      mockStorage.setItem('bestScore', currentBest);
      scoreManager.loadBestScore();

      scoreManager.submitScore(newScore);

      expect(mockStorage.setItem).not.toHaveBeenCalledWith('bestScore', newScore);
      expect(scoreManager.getBestScore()).toBe(currentBest);
    });

    it('should not show new best score message when the new score is lower', () => {
      const currentBest = 100;
      const newScore = 50;
      mockStorage.setItem('bestScore', currentBest);
      scoreManager.loadBestScore();

      scoreManager.submitScore(newScore);

      expect(mockUICallback).not.toHaveBeenCalledWith('showNewBestScoreMessage', true);
    });
  });
});