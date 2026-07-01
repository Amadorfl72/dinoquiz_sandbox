describe('ScoreManager - Best Score Persistence and Error Scenarios', () => {
  let ScoreManager;
  let mockStorage;

  beforeEach(() => {
    jest.resetModules();
    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    global.localStorage = mockStorage;
    ScoreManager = require('../ScoreManager').ScoreManager;
  });

  describe('Best Score Persistence', () => {
    it('should load best score from localStorage if available', () => {
      mockStorage.getItem.mockReturnValue('1500');
      const manager = new ScoreManager();
      expect(manager.getBestScore()).toBe(1500);
      expect(mockStorage.getItem).toHaveBeenCalledWith('bestScore');
    });

    it('should return 0 if no best score is saved', () => {
      mockStorage.getItem.mockReturnValue(null);
      const manager = new ScoreManager();
      expect(manager.getBestScore()).toBe(0);
    });

    it('should save best score to localStorage', () => {
      mockStorage.getItem.mockReturnValue(null);
      const manager = new ScoreManager();
      manager.saveBestScore(2000);
      expect(mockStorage.setItem).toHaveBeenCalledWith('bestScore', '2000');
    });

    it('should update best score if new score is higher', () => {
      mockStorage.getItem.mockReturnValue('1000');
      const manager = new ScoreManager();
      manager.saveBestScore(1500);
      expect(mockStorage.setItem).toHaveBeenCalledWith('bestScore', '1500');
    });

    it('should not update best score if new score is lower', () => {
      mockStorage.getItem.mockReturnValue('2000');
      const manager = new ScoreManager();
      manager.saveBestScore(1000);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Error Scenarios', () => {
    it('should continue normally when localStorage is disabled (null)', () => {
      global.localStorage = null;
      
      expect(() => {
        const manager = new ScoreManager();
        expect(manager.getBestScore()).toBe(0);
      }).not.toThrow();
    });

    it('should not throw when saving score if localStorage is disabled (null)', () => {
      global.localStorage = null;
      const manager = new ScoreManager();
      
      expect(() => {
        manager.saveBestScore(500);
      }).not.toThrow();
    });

    it('should continue normally when localStorage throws an error on getItem', () => {
      mockStorage.getItem.mockImplementation(() => {
        throw new Error('SecurityError');
      });
      
      expect(() => {
        const manager = new ScoreManager();
        expect(manager.getBestScore()).toBe(0);
      }).not.toThrow();
    });

    it('should continue normally when localStorage throws an error on setItem', () => {
      mockStorage.getItem.mockReturnValue(null);
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      
      const manager = new ScoreManager();
      expect(() => {
        manager.saveBestScore(500);
      }).not.toThrow();
    });
  });
});