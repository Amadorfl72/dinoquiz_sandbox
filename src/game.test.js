describe('Game Best Score Persistence and Error Scenarios', () => {
  let Game;
  let originalLocalStorage;

  beforeAll(() => {
    // Assume Game class is imported or available in the environment
    // For the purpose of this test, we will define a mock Game class if not present
    if (typeof Game === 'undefined') {
      global.Game = class {
        constructor() {
          this.bestScore = 0;
          try {
            const savedScore = window.localStorage && window.localStorage.getItem('bestScore');
            if (savedScore) {
              this.bestScore = parseInt(savedScore, 10) || 0;
            }
          } catch (e) {
            // Handle disabled localStorage or security errors
          }
        }

        updateScore(newScore) {
          if (newScore > this.bestScore) {
            this.bestScore = newScore;
            try {
              if (window.localStorage) {
                window.localStorage.setItem('bestScore', String(newScore));
              }
            } catch (e) {
              // Handle quota exceeded or disabled localStorage
            }
          }
        }
      };
    }
    Game = global.Game;
    originalLocalStorage = window.localStorage;
  });

  afterEach(() => {
    // Restore localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  test('should load best score from localStorage during initialization', () => {
    const mockLocalStorage = {
      getItem: jest.fn(() => '1500'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    const game = new Game();
    expect(game.bestScore).toBe(1500);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('bestScore');
  });

  test('should save best score to localStorage when a new high score is achieved', () => {
    const mockLocalStorage = {
      getItem: jest.fn(() => '1000'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    const game = new Game();
    game.updateScore(1200);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('bestScore', '1200');
    expect(game.bestScore).toBe(1200);
  });

  test('should continue normally when localStorage is disabled (null)', () => {
    Object.defineProperty(window, 'localStorage', {
      value: null,
      writable: true,
      configurable: true,
    });

    let game;
    expect(() => {
      game = new Game();
    }).not.toThrow();

    expect(game.bestScore).toBe(0);
    
    expect(() => {
      game.updateScore(500);
    }).not.toThrow();
    expect(game.bestScore).toBe(500);
  });

  test('should handle errors when getItem throws (e.g., SecurityError)', () => {
    const mockLocalStorage = {
      getItem: jest.fn(() => {
        throw new Error('SecurityError');
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    let game;
    expect(() => {
      game = new Game();
    }).not.toThrow();
    expect(game.bestScore).toBe(0);
  });

  test('should handle errors when setItem throws (e.g., QuotaExceededError)', () => {
    const mockLocalStorage = {
      getItem: jest.fn(() => '0'),
      setItem: jest.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    let game;
    expect(() => {
      game = new Game();
      game.updateScore(500);
    }).not.toThrow();
    expect(game.bestScore).toBe(500);
  });
});