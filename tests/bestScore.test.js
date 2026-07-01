const BestScoreManager = require('../src/bestScoreManager');

describe('TRIOFSND-33: Best Score Persistence and Feedback', () => {
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
      }),
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      configurable: true,
      writable: true
    });
  });

  describe('Reading and Writing Best Score', () => {
    it('should read the best score from localStorage', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '150';
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(150);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('triofsnd_best_score');
    });

    it('should return 0 if no best score is saved', () => {
      const manager = new BestScoreManager();
      expect(manager.getBestScore()).toBe(0);
    });

    it('should write the best score to localStorage', () => {
      const manager = new BestScoreManager();
      manager.saveBestScore(200);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('triofsnd_best_score', '200');
      expect(manager.getBestScore()).toBe(200);
    });
  });

  describe('New Best Score Detection and Feedback', () => {
    it('should detect new best score and save it', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '100';
      const manager = new BestScoreManager();
      const isNewBest = manager.checkAndSaveScore(150);
      
      expect(isNewBest).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('triofsnd_best_score', '150');
    });

    it('should not detect new best score if score is lower', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '200';
      const manager = new BestScoreManager();
      const isNewBest = manager.checkAndSaveScore(150);
      
      expect(isNewBest).toBe(false);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not detect new best score if score is equal', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '150';
      const manager = new BestScoreManager();
      const isNewBest = manager.checkAndSaveScore(150);
      
      expect(isNewBest).toBe(false);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should trigger feedback callback when new best score is achieved', () => {
      const onNewBestScore = jest.fn();
      const manager = new BestScoreManager({ onNewBestScore });
      
      manager.checkAndSaveScore(100);
      
      expect(onNewBestScore).toHaveBeenCalledWith('¡Nueva mejor puntuación!');
    });

    it('should not trigger feedback callback when score is not a new best', () => {
      mockLocalStorage.store['triofsnd_best_score'] = '200';
      const onNewBestScore = jest.fn();
      const manager = new BestScoreManager({ onNewBestScore });
      
      manager.checkAndSaveScore(100);
      
      expect(onNewBestScore).not.toHaveBeenCalled();
    });
  });

  describe('Graceful Handling of localStorage Failures', () => {
    it('should handle localStorage read failure gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      
      const manager = new BestScoreManager();
      expect(() => manager.getBestScore()).not.toThrow();
      expect(manager.getBestScore()).toBe(0);
    });

    it('should handle localStorage write failure gracefully without blocking UI', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const manager = new BestScoreManager();
      expect(() => manager.saveBestScore(500)).not.toThrow();
      expect(() => manager.checkAndSaveScore(500)).not.toThrow();
    });

    it('should still trigger feedback even if localStorage write fails', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const onNewBestScore = jest.fn();
      const manager = new BestScoreManager({ onNewBestScore });
      
      const isNewBest = manager.checkAndSaveScore(500);
      
      expect(isNewBest).toBe(true);
      expect(onNewBestScore).toHaveBeenCalledWith('¡Nueva mejor puntuación!');
    });
  });
});