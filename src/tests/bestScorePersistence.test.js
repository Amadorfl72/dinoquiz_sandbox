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
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.localStorage;
  });

  it('should save and retrieve the best score when localStorage is available', () => {
    const score = 8;
    saveBestScore(score);
    expect(localStorage.setItem).toHaveBeenCalledWith('dinoQuizBestScore', score.toString());

    localStorage.getItem.mockReturnValue(score.toString());
    const retrievedScore = getBestScore();
    expect(retrievedScore).toBe(score);
    expect(localStorage.getItem).toHaveBeenCalledWith('dinoQuizBestScore');
  });

  it('should handle disabled localStorage without throwing errors', () => {
    // Simulate localStorage being disabled or not available
    global.localStorage = undefined;

    const score = 8;
    expect(() => saveBestScore(score)).not.toThrow();
    expect(() => getBestScore()).not.toThrow();
  });

  it('should handle null localStorage without throwing errors', () => {
    global.localStorage = null;

    const score = 8;
    expect(() => saveBestScore(score)).not.toThrow();
    expect(() => getBestScore()).not.toThrow();
  });

  it('should handle localStorage setItem throwing an error without crashing', () => {
    localStorage.setItem.mockImplementation(() => {
      throw new TypeError("Cannot read properties of undefined (reading 'setItem')");
    });

    expect(() => saveBestScore(10)).not.toThrow();
  });

  it('should handle localStorage getItem throwing an error and return 0', () => {
    localStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => getBestScore()).not.toThrow();
    expect(getBestScore()).toBe(0);
  });

  it('should return 0 when no best score is stored', () => {
    localStorage.getItem.mockReturnValue(null);
    const retrievedScore = getBestScore();
    expect(retrievedScore).toBe(0);
  });

  it('should handle corrupted score data gracefully', () => {
    localStorage.getItem.mockReturnValue('corrupted');
    const retrievedScore = getBestScore();
    expect(retrievedScore).toBe(0);
  });
});
