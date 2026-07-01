describe('TRIOFSND-48: Best score persistence and error scenarios', () => {
  let Game;
  let localStorageMock;

  beforeEach(() => {
    let store = {};
    localStorageMock = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
      clear: jest.fn(() => { store = {}; }),
      removeItem: jest.fn((key) => { delete store[key]; }),
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });

    jest.resetModules();
    Game = require('./Game').Game;
  });

  test('1) Best score persists after close/reopen', () => {
    let game = new Game();
    game.endGameWithScore(150);

    // Simulate close/reopen by creating a new instance
    game = new Game();
    
    expect(game.getBestScore()).toBe(150);
  });

  test('2) New best updates localStorage and shows message', () => {
    const game = new Game();
    game.endGameWithScore(100);

    const result = game.endGameWithScore(120);
    
    expect(game.getBestScore()).toBe(120);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('triofsnd_best_score', '120');
    expect(result.newBestScore).toBe(true);
    expect(result.message).toMatch(/new best score/i);
  });

  test('3) Tie does not update or show message', () => {
    const game = new Game();
    game.endGameWithScore(100);

    const result = game.endGameWithScore(100);
    
    expect(game.getBestScore()).toBe(100);
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('triofsnd_best_score', '100');
    expect(result.newBestScore).toBe(false);
    expect(result.message).toBeNull();
  });

  test('4) Disabled localStorage doesn\'t block game and shows no error', () => {
    Object.defineProperty(window, 'localStorage', {
      get: () => { throw new Error('Access denied'); },
      configurable: true
    });

    jest.resetModules();
    Game = require('./Game').Game;
    
    let game;
    expect(() => {
      game = new Game();
    }).not.toThrow();

    let result;
    expect(() => {
      result = game.endGameWithScore(200);
    }).not.toThrow();

    expect(result.newBestScore).toBe(false);
    expect(result.message).toBeNull();
    expect(game.getBestScore()).toBe(0);
  });
});
