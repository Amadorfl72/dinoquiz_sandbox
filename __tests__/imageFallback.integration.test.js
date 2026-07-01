const { Game } = require('../src/game');

describe('TRIOFSND-21: Image fallback integration', () => {
  let game;
  let mockImageElement;

  beforeEach(() => {
    mockImageElement = {
      src: '',
      onload: null,
      onerror: null,
      naturalWidth: 0,
      naturalHeight: 0,
      complete: false,
      addEventListener: jest.fn((event, handler) => {
        if (event === 'error') mockImageElement.onerror = handler;
        if (event === 'load') mockImageElement.onload = handler;
      }),
      removeEventListener: jest.fn(),
    };

    game = new Game({ imageElement: mockImageElement, autoStart: false });
  });

  afterEach(() => {
    if (game && typeof game.stop === 'function') {
      game.stop();
    }
  });

  it('should register an error event listener on the image element at startup', () => {
    expect(mockImageElement.addEventListener).toHaveBeenCalledWith(
      'error',
      expect.any(Function)
    );
  });

  it('should register a load event listener on the image element at startup', () => {
    expect(mockImageElement.addEventListener).toHaveBeenCalledWith(
      'load',
      expect.any(Function)
    );
  });

  it('should trigger fallback when image src points to a non-existent resource', () => {
    game.start();
    mockImageElement.src = 'invalid-path.png';
    mockImageElement.onerror && mockImageElement.onerror();

    expect(game.getRenderState().usingPlaceholder).toBe(true);
  });

  it('should maintain game speed after image failure', () => {
    game.start();
    const initialSpeed = game.getSpeed();

    mockImageElement.onerror && mockImageElement.onerror();

    for (let i = 0; i < 50; i++) {
      game.tick();
    }

    expect(game.getSpeed()).toBeGreaterThanOrEqual(initialSpeed);
  });

  it('should allow game over and restart after image failure', () => {
    game.start();
    mockImageElement.onerror && mockImageElement.onerror();

    game.triggerGameOver();
    expect(game.isGameOver()).toBe(true);

    game.restart();
    expect(game.isRunning()).toBe(true);
    expect(game.isGameOver()).toBe(false);
  });

  it('should not show placeholder if image loads before error fires', () => {
    mockImageElement.naturalWidth = 88;
    mockImageElement.naturalHeight = 94;
    mockImageElement.complete = true;

    game.start();
    mockImageElement.onload && mockImageElement.onload();

    expect(game.getRenderState().usingPlaceholder).toBe(false);
  });

  it('should handle rapid successive error and load events without crashing', () => {
    game.start();

    expect(() => {
      for (let i = 0; i < 20; i++) {
        mockImageElement.onerror && mockImageElement.onerror();
        mockImageElement.onload && mockImageElement.onload();
      }
    }).not.toThrow();
  });

  it('should preserve obstacle positions when switching to placeholder', () => {
    game.start();
    game.spawnObstacle(200);
    const obstaclesBefore = game.getObstacles().map((o) => ({ x: o.x, y: o.y }));

    mockImageElement.onerror && mockImageElement.onerror();
    game.update();

    const obstaclesAfter = game.getObstacles();
    expect(obstaclesAfter.length).toBe(obstaclesBefore.length);
    expect(obstaclesAfter[0].x).toBeLessThanOrEqual(obstaclesBefore[0].x);
  });
});
