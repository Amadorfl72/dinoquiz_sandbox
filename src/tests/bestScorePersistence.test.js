import { saveBestScore, getBestScore } from '../utils/scoreStorage';
import { showBestScoreMessage } from '../utils/feedback';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock showBestScoreMessage
jest.mock('../utils/feedback', () => ({
  showBestScoreMessage: jest.fn(),
}));

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('Best Score Persistence', () => {
  test('1) Best score persists after close/reopen', () => {
    const initialBestScore = 5;
    saveBestScore(initialBestScore);
    
    // Simulate app close/reopen
    const retrievedBestScore = getBestScore();
    
    expect(retrievedBestScore).toBe(initialBestScore);
    expect(localStorage.setItem).toHaveBeenCalledWith('bestScore', initialBestScore.toString());
    expect(localStorage.getItem).toHaveBeenCalledWith('bestScore');
  });

  test('2) New best updates localStorage and shows message', () => {
    const newBestScore = 8;
    saveBestScore(newBestScore);
    
    expect(localStorage.setItem).toHaveBeenCalledWith('bestScore', newBestScore.toString());
    expect(showBestScoreMessage).toHaveBeenCalledWith(newBestScore);
  });

  test('3) Tie does not update or show message', () => {
    const currentBestScore = 7;
    saveBestScore(currentBestScore);
    
    // Try to save the same score again
    saveBestScore(currentBestScore);
    
    expect(localStorage.setItem).toHaveBeenCalledTimes(1); // Only called once during initial save
    expect(showBestScoreMessage).not.toHaveBeenCalled();
  });

  test('4) Disabled localStorage doesn\'t block game and shows no error', () => {
    // Simulate localStorage being disabled
    Object.defineProperty(window, 'localStorage', {
      value: null,
    });
    
    const score = 6;
    
    // Should not throw errors
    expect(() => saveBestScore(score)).not.toThrow();
    expect(() => getBestScore()).not.toThrow();
    
    // Should not show any message
    expect(showBestScoreMessage).not.toHaveBeenCalled();
  });
});