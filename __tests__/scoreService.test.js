describe('Score Persistence', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
  });

  afterEach(() => {
    if (originalLocalStorage === undefined) {
      delete global.localStorage;
    } else {
      Object.defineProperty(global, 'localStorage', { value: originalLocalStorage, configurable: true });
    }
  });

  it('should save best score to localStorage when available', () => {
    const mockLocalStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, configurable: true });

    const { saveBestScore } = require('../src/services/scoreService');
    saveBestScore(100);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('bestScore', '100');
  });

  it('should retrieve best score from localStorage when available', () => {
    const mockLocalStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(() => '150'),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, configurable: true });

    const { getBestScore } = require('../src/services/scoreService');
    const score = getBestScore();

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('bestScore');
    expect(score).toBe(150);
  });

  it('should not throw an error when localStorage is undefined', () => {
    Object.defineProperty(global, 'localStorage', { value: undefined, configurable: true });

    const { saveBestScore, getBestScore } = require('../src/services/scoreService');
    
    expect(() => saveBestScore(200)).not.toThrow();
    expect(() => getBestScore()).not.toThrow();
    expect(getBestScore()).toBe(0);
  });

  it('should not throw an error when localStorage.setItem throws', () => {
    const mockLocalStorage = {
      setItem: jest.fn(() => { throw new Error('QuotaExceededError'); }),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, configurable: true });

    const { saveBestScore } = require('../src/services/scoreService');
    
    expect(() => saveBestScore(300)).not.toThrow();
  });

  it('should not throw an error when localStorage.getItem throws', () => {
    const mockLocalStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(() => { throw new Error('SecurityError'); }),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, configurable: true });

    const { getBestScore } = require('../src/services/scoreService');
    
    expect(() => getBestScore()).not.toThrow();
    expect(getBestScore()).toBe(0);
  });
});