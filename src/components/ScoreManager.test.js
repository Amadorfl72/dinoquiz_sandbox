const ScoreManager = require('./ScoreManager');

describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  let scoreManager;
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    global.localStorage = {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: jest.fn((key) => { delete mockStorage[key]; }),
      clear: jest.fn(() => { mockStorage = {}; })
    };
    scoreManager = new ScoreManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tie score scenario', () => {
    it('should not update best score on a tie', () => {
      scoreManager.bestScore = 100;
      scoreManager.updateScore(100);

      expect(scoreManager.bestScore).toBe(100);
      expect(scoreManager.isNewBestScore).toBe(false);
    });

    it('should not show new best score message on a tie', () => {
      scoreManager.bestScore = 100;
      scoreManager.updateScore(100);

      expect(scoreManager.shouldShowBestScoreMessage()).toBe(false);
    });
  });

  describe('Best score persistence', () => {
    it('should update best score when new score is higher', () => {
      scoreManager.bestScore = 100;
      scoreManager.updateScore(150);

      expect(scoreManager.bestScore).toBe(150);
      expect(scoreManager.isNewBestScore).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('bestScore', '150');
    });

    it('should not update best score when new score is lower', () => {
      scoreManager.bestScore = 100;
      scoreManager.updateScore(50);

      expect(scoreManager.bestScore).toBe(100);
      expect(scoreManager.isNewBestScore).toBe(false);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Error scenarios', () => {
    it('should handle localStorage errors gracefully without crashing', () => {
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      scoreManager.bestScore = 100;
      
      expect(() => scoreManager.updateScore(150)).not.toThrow();
      expect(scoreManager.bestScore).toBe(150);
      expect(scoreManager.isNewBestScore).toBe(true);
    });
  });
});