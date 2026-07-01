const {
  getBestScore,
  saveBestScore,
  checkAndSaveBestScore
} = require('./scoreManager');

describe('ScoreManager - Best Score Persistence and Feedback', () => {
  let mockLocalStorage;

  beforeEach(() => {
    mockLocalStorage = {
      store: {},
      getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
      setItem: jest.fn((key, value) => {
        mockLocalStorage.store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete mockLocalStorage.store[key];
      }),
      clear: jest.fn(() => {
        mockLocalStorage.store = {};
      })
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
  });

  describe('getBestScore', () => {
    it('should return the best score from localStorage if it exists', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '150';
      const score = getBestScore();
      expect(score).toBe(150);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('triofsnd_best_score');
    });

    it('should return 0 if no best score is saved', () => {
      const score = getBestScore();
      expect(score).toBe(0);
    });

    it('should return 0 and not throw if localStorage fails', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage unavailable');
      });
      
      expect(() => getBestScore()).not.toThrow();
      const score = getBestScore();
      expect(score).toBe(0);
    });
  });

  describe('saveBestScore', () => {
    it('should save the score to localStorage', () => {
      saveBestScore(200);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('triofsnd_best_score', '200');
      expect(mockLocalStorage.store['triofsnd_best_score']).toBe('200');
    });

    it('should handle localStorage failures gracefully without throwing', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveBestScore(300)).not.toThrow();
    });
  });

  describe('checkAndSaveBestScore', () => {
    it('should save the new score and return true if current score beats persisted score', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '100';
      const result = checkAndSaveBestScore(150);
      
      expect(result.isNewBest).toBe(true);
      expect(result.feedback).toBe('¡Nueva mejor puntuación!');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('triofsnd_best_score', '150');
    });

    it('should not save and return false if current score does not beat persisted score', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '200';
      const result = checkAndSaveBestScore(150);
      
      expect(result.isNewBest).toBe(false);
      expect(result.feedback).toBe('');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should save and return true if there is no persisted score yet', () => {
      const result = checkAndSaveBestScore(50);
      
      expect(result.isNewBest).toBe(true);
      expect(result.feedback).toBe('¡Nueva mejor puntuación!');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('triofsnd_best_score', '50');
    });

    it('should handle localStorage failure gracefully and still return feedback without blocking UI', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage unavailable');
      });
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        const result = checkAndSaveBestScore(100);
        expect(result.isNewBest).toBe(true);
        expect(result.feedback).toBe('¡Nueva mejor puntuación!');
      }).not.toThrow();
    });
  });
});