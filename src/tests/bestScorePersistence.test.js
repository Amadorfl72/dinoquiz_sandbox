import { saveBestScore, getBestScore } from '../utils/scoreStorage';

describe('Best Score Persistence', () => {
  beforeEach(() => {
    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
  });

  it('should save and retrieve the best score', () => {
    const score = 8;
    saveBestScore(score);
    expect(localStorage.setItem).toHaveBeenCalledWith('bestScore', score.toString());

    localStorage.getItem.mockReturnValue(score.toString());
    const retrievedScore = getBestScore();
    expect(retrievedScore).toBe(score);
  });

  it('should return 0 when no best score is saved', () => {
    localStorage.getItem.mockReturnValue(null);
    const retrievedScore = getBestScore();
    expect(retrievedScore).toBe(0);
  });

  it('should handle localStorage being disabled', () => {
    global.localStorage = null;
    
    // Should not throw when saving
    expect(() => saveBestScore(5)).not.toThrow();
    
    // Should return 0 when retrieving
    expect(getBestScore()).toBe(0);
  });

  it('should handle localStorage errors gracefully', () => {
    localStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    
    expect(() => saveBestScore(5)).not.toThrow();
    
    localStorage.getItem.mockImplementation(() => {
      throw new Error('Storage not available');
    });
    
    expect(getBestScore()).toBe(0);
  });
});