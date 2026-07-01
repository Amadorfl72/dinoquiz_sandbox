const { BestScoreManager } = require('../bestScoreManager');

describe('BestScoreManager', () => {
  let manager;
  let mockStorage;

  beforeEach(() => {
    mockStorage = {
      store: {},
      getItem: jest.fn((key) => mockStorage.store[key] || null),
      setItem: jest.fn((key, value) => { mockStorage.store[key] = value; }),
      removeItem: jest.fn((key) => { delete mockStorage.store[key]; }),
      clear: jest.fn(() => { mockStorage.store = {}; })
    };
    
    // Mock global localStorage
    global.localStorage = mockStorage;
    
    manager = new BestScoreManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.localStorage;
  });

  describe('Best score persistence', () => {
    it('should save a new best score to localStorage when score is higher', () => {
      const result = manager.updateBestScore(100);
      
      expect(result.isNewBest).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalledWith('bestScore', '100');
      expect(manager.getBestScore()).toBe(100);
    });

    it('should retrieve the best score from localStorage on initialization', () => {
      mockStorage.store['bestScore'] = '250';
      const newManager = new BestScoreManager();
      
      expect(newManager.getBestScore()).toBe(250);
    });

    it('should return 0 as best score if no score is saved', () => {
      expect(manager.getBestScore()).toBe(0);
    });
  });

  describe('Tie score scenario (TRIOFSND-48)', () => {
    it('should NOT update best score when score ties the current best score', () => {
      manager.updateBestScore(150);
      mockStorage.setItem.mockClear();
      
      const result = manager.updateBestScore(150);
      
      expect(result.isNewBest).toBe(false);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
      expect(manager.getBestScore()).toBe(150);
    });

    it('should NOT show new best score message when score ties the current best score', () => {
      manager.updateBestScore(150);
      
      const result = manager.updateBestScore(150);
      
      expect(result.isNewBest).toBe(false);
      expect(result.showMessage).toBe(false);
    });
  });

  describe('Lower score scenario', () => {
    it('should NOT update best score when score is lower than current best score', () => {
      manager.updateBestScore(200);
      mockStorage.setItem.mockClear();
      
      const result = manager.updateBestScore(100);
      
      expect(result.isNewBest).toBe(false);
      expect(mockStorage.setItem).not.toHaveBeenCalled();
      expect(manager.getBestScore()).toBe(200);
    });

    it('should NOT show new best score message when score is lower than current best score', () => {
      manager.updateBestScore(200);
      
      const result = manager.updateBestScore(100);
      
      expect(result.isNewBest).toBe(false);
      expect(result.showMessage).toBe(false);
    });
  });

  describe('Error scenarios', () => {
    it('should handle localStorage access errors gracefully when getting best score', () => {
      mockStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });
      
      const newManager = new BestScoreManager();
      
      expect(newManager.getBestScore()).toBe(0);
    });

    it('should handle localStorage access errors gracefully when saving best score', () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const result = manager.updateBestScore(300);
      
      expect(result.isNewBest).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Storage quota exceeded');
    });

    it('should handle invalid score values gracefully', () => {
      const result = manager.updateBestScore(null);
      
      expect(result.isNewBest).toBe(false);
      expect(result.error).toBeDefined();
      expect(manager.getBestScore()).toBe(0);
    });

    it('should handle NaN score values gracefully', () => {
      const result = manager.updateBestScore(NaN);
      
      expect(result.isNewBest).toBe(false);
      expect(result.error).toBeDefined();
      expect(manager.getBestScore()).toBe(0);
    });
  });
});