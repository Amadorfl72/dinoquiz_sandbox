const BestScoreManager = require('./bestScore');
const Game = require('./game');

describe('Game initialization with localStorage scenarios', () => {
  let originalLocalStorage;
  let originalWindow;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    originalWindow = global.window;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    global.window = originalWindow;
    jest.restoreAllMocks();
  });

  it('should initialize the game without throwing when localStorage is available', () => {
    const store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] ?? null),
      setItem: jest.fn((key, value) => { store[key] = String(value); }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { for (const k of Object.keys(store)) delete store[k]; })
    };
    global.window = { localStorage: global.localStorage };

    expect(() => new Game()).not.toThrow();
    const game = new Game();
    expect(game.bestScore).toBe(0);
  });

  it('should initialize the game without throwing when localStorage is null (TRIOFSND-48)', () => {
    global.window = { localStorage: null };
    expect(() => new Game()).not.toThrow();
    const game = new Game();
    expect(game.bestScore).toBe(0);
  });

  it('should initialize the game without throwing when window is undefined', () => {
    global.window = undefined;
    expect(() => new Game()).not.toThrow();
    const game = new Game();
    expect(game.bestScore).toBe(0);
  });

  it('should initialize the game without throwing when localStorage access throws', () => {
    global.localStorage = {
      getItem: jest.fn(() => { throw new Error('SecurityError'); }),
      setItem: jest.fn(() => { throw new Error('SecurityError'); }),
      removeItem: jest.fn(() => { throw new Error('SecurityError'); }),
      clear: jest.fn(() => { throw new Error('SecurityError'); })
    };
    global.window = { localStorage: global.localStorage };
    expect(() => new Game()).not.toThrow();
    const game = new Game();
    expect(game.bestScore).toBe(0);
  });

  it('should preserve best score in memory across game restarts when localStorage is disabled', () => {
    global.window = { localStorage: null };
    const game1 = new Game();
    game1.bestScoreManager.updateBestScore(2500);
    expect(game1.bestScore).toBe(2500);

    const game2 = new Game();
    expect(game2.bestScore).toBe(0);
  });

  it('should not throw TypeError: Cannot read property getItem of null', () => {
    global.window = { localStorage: null };
    let caughtError = null;
    try {
      new Game();
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeNull();
  });
});
