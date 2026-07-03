import { saveBestScore, getBestScore } from '../utils/scoreStorage';

describe('TRIOFSND-48: Best Score Persistence and Error Scenarios', () => {
  beforeEach(() => {
    // Mock localStorage with full Storage-like API
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0,
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.localStorage;
  });

  describe('happy path', () => {
    it('should save the best score to localStorage with the correct key', () => {
      const score = 8;
      saveBestScore(score);
      expect(global.localStorage.setItem).toHaveBeenCalledWith('dinoQuizBestScore', '8');
    });

    it('should retrieve the best score from localStorage when present', () => {
      global.localStorage.getItem.mockReturnValue('8');
      const retrievedScore = getBestScore();
      expect(retrievedScore).toBe(8);
      expect(global.localStorage.getItem).toHaveBeenCalledWith('dinoQuizBestScore');
    });

    it('should return 0 when no best score is stored', () => {
      global.localStorage.getItem.mockReturnValue(null);
      expect(getBestScore()).toBe(0);
    });

    it('should return 0 when stored value is empty string', () => {
      global.localStorage.getItem.mockReturnValue('');
      expect(getBestScore()).toBe(0);
    });

    it('should handle corrupted score data gracefully and return 0', () => {
      global.localStorage.getItem.mockReturnValue('corrupted');
      expect(getBestScore()).toBe(0);
    });

    it('should parse numeric strings correctly', () => {
      global.localStorage.getItem.mockReturnValue('15');
      expect(getBestScore()).toBe(15);
    });
  });

  describe('disabled / unavailable localStorage', () => {
    it('should not throw when localStorage is undefined on save', () => {
      global.localStorage = undefined;
      expect(() => saveBestScore(8)).not.toThrow();
    });

    it('should not throw when localStorage is undefined on get', () => {
      global.localStorage = undefined;
      expect(() => getBestScore()).not.toThrow();
      expect(getBestScore()).toBe(0);
    });

    it('should not throw when localStorage is null on save', () => {
      global.localStorage = null;
      expect(() => saveBestScore(8)).not.toThrow();
    });

    it('should not throw when localStorage is null on get', () => {
      global.localStorage = null;
      expect(() => getBestScore()).not.toThrow();
      expect(getBestScore()).toBe(0);
    });

    it('should not log an error when localStorage is undefined (disabled, not broken)', () => {
      global.localStorage = undefined;
      saveBestScore(8);
      getBestScore();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('localStorage throws errors', () => {
    it('should handle setItem throwing TypeError without crashing the game', () => {
      global.localStorage.setItem.mockImplementation(() => {
        throw new TypeError("Cannot read properties of undefined (reading 'setItem')");
      });

      expect(() => saveBestScore(10)).not.toThrow();
    });

    it('should log an error when setItem throws', () => {
      const error = new TypeError("Cannot read properties of undefined (reading 'setItem')");
      global.localStorage.setItem.mockImplementation(() => {
        throw error;
      });

      saveBestScore(10);
      expect(console.error).toHaveBeenCalledWith('Failed to save best score:', error);
    });

    it('should handle getItem throwing an error and return 0', () => {
      global.localStorage.getItem.mockImplementation(() => {
        throw new Error('SecurityError');
      });

      expect(() => getBestScore()).not.toThrow();
      expect(getBestScore()).toBe(0);
    });

    it('should log an error when getItem throws', () => {
      const error = new Error('SecurityError');
      global.localStorage.getItem.mockImplementation(() => {
        throw error;
      });

      getBestScore();
      expect(console.error).toHaveBeenCalledWith('Failed to retrieve best score:', error);
    });

    it('should handle QuotaExceededError on setItem without crashing', () => {
      global.localStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => saveBestScore(10)).not.toThrow();
    });
  });

  describe('game continues regardless of storage state', () => {
    it('should allow saving a new score after a previous save failed', () => {
      global.localStorage.setItem.mockImplementationOnce(() => {
        throw new TypeError('boom');
      });

      expect(() => saveBestScore(5)).not.toThrow();

      // Second call succeeds
      saveBestScore(7);
      expect(global.localStorage.setItem).toHaveBeenLastCalledWith('dinoQuizBestScore', '7');
    });

    it('should allow retrieving a score after a previous get failed', () => {
      global.localStorage.getItem.mockImplementationOnce(() => {
        throw new Error('boom');
      });

      expect(getBestScore()).toBe(0);

      global.localStorage.getItem.mockReturnValue('12');
      expect(getBestScore()).toBe(12);
    });
  });
});
