const { Game } = require('../src/game');
const { handleImageError, isPlaceholderActive } = require('../src/imageFallback');

describe('TRIOFSND-21: Game continues after image failure', () => {
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
    };

    game = new Game({ imageElement: mockImageElement, autoStart: false });
  });

  afterEach(() => {
    if (game && typeof game.stop === 'function') {
      game.stop();
    }
  });

  it('should not block the game loop when the dinosaur image fails to load', () => {
    game.start();
    const initialFrameCount = game.getFrameCount();

    mockImageElement.onerror && mockImageElement.onerror();

    // Simulate a few frames
    game.tick();
    game.tick();
    game.tick();

    expect(game.getFrameCount()).toBeGreaterThan(initialFrameCount);
  });

  it('should keep the game in a running state after image error', () => {
    game.start();
    expect(game.isRunning()).toBe(true);

    mockImageElement.onerror && mockImageElement.onerror();

    expect(game.isRunning()).toBe(true);
  });

  it('should not throw an error when updating game state with a failed image', () => {
    game.start();
    mockImageElement.onerror && mockImageElement.onerror();

    expect(() => {
      game.update();
      game.render();
    }).not.toThrow();
  });

  it('should allow the dinosaur to jump even when the image is missing', () => {
    game.start();
    mockImageElement.onerror && mockImageElement.onerror();

    game.jump();
    game.update();

    expect(game.getDinosaurYPosition()).toBeLessThan(game.getGroundYPosition());
  });

  it('should continue detecting collisions with obstacles after image failure', () => {
    game.start();
    mockImageElement.onerror && mockImageElement.onerror();

    game.spawnObstacle(50);
    game.update();

    expect(game.getObstacleCount()).toBeGreaterThan(0);
  });

  it('should increment the score over time even with a placeholder', () => {
    game.start();
    mockImageElement.onerror && mockImageElement.onerror();

    const initialScore = game.getScore();
    for (let i = 0; i < 10; i++) {
      game.tick();
    }

    expect(game.getScore()).toBeGreaterThan(initialScore);
  });

  it('should render the placeholder in place of the dinosaur image', () => {
    game.start();
    mockImageElement.onerror && mockImageElement.onerror();

    const renderOutput = game.getRenderState();
    expect(renderOutput.usingPlaceholder).toBe(true);
  });

  it('should not attempt to reload the image in a tight loop (avoid blocking)', () => {
    game.start();
    const reloadSpy = jest.spyOn(game, 'reloadImage');

    mockImageElement.onerror && mockImageElement.onerror();

    for (let i = 0; i < 100; i++) {
      game.tick();
    }

    expect(reloadSpy).not.toHaveBeenCalledTimes(100);
  });
});
