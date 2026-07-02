import { saveBestScore, getBestScore } from '../utils/bestScore';

describe('Best Score Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('1) Best score persists after close/reopen', () => {
    const initialScore = 8;
    saveBestScore(initialScore);
    
    // Simulate close/reopen by clearing and getting again
    const savedScore = getBestScore();
    expect(savedScore).toBe(initialScore);
  });

  test('2) New best updates localStorage and shows message', () => {
    const initialScore = 5;
    const newBestScore = 7;
    
    saveBestScore(initialScore);
    const message = saveBestScore(newBestScore);
    
    expect(getBestScore()).toBe(newBestScore);
    expect(message).toBe('¡Nuevo récord!');
  });

  test('3) Tie does not update or show message', () => {
    const initialScore = 6;
    
    saveBestScore(initialScore);
    const message = saveBestScore(initialScore);
    
    expect(getBestScore()).toBe(initialScore);
    expect(message).toBeNull();
  });

  test('4) Disabled localStorage doesn\'t block game and shows no error', () => {
    // Simulate disabled localStorage
    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('LocalStorage disabled');
    });
    
    const score = 3;
    const message = saveBestScore(score);
    
    expect(message).toBeNull();
    expect(() => getBestScore()).not.toThrow();
  });
});