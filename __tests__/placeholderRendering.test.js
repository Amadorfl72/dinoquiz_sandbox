const { Game } = require('../src/game');

describe('TRIOFSND-21: Placeholder rendering', () => {
  let game;
  let mockImageElement;
  let mockCanvas;

  beforeEach(() => {
    mockImageElement = {
      src: '',
      onload: null,
      onerror: null,
      naturalWidth: 0,
      naturalHeight: 0,
      complete: false,
    };

    mockCanvas = {
      width: 600,
      height: 150,
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        clearRect: jest.fn(),
        fillStyle: '',
        fillText: jest.fn(),
        font: '',
      })),
    };

    game = new Game({
      imageElement: mockImageElement,
      canvas: mockCanvas,
      autoStart: false,
    });
  });

  afterEach(() => {
    if (game && typeof game.stop === 'function') {
      game.stop();
    }
  });

  it('should draw a placeholder rectangle when image fails to load', () => {
    const ctx = mockCanvas.getContext();
    game.start();

    mockImageElement.onerror && mockImageElement.onerror();
    game.render();

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('should not call drawImage with the broken image when placeholder is active', () => {
    const ctx = mockCanvas.getContext();
    game.start();

    mockImageElement.onerror && mockImageElement.onerror();
    game.render();

    const drawImageCalls = ctx.drawImage.mock.calls;
    const drewBrokenImage = drawImageCalls.some(
      (call) => call[0] === mockImageElement
    );
    expect(drewBrokenImage).toBe(false);
  });

  it('should call drawImage normally when image loads successfully', () => {
    const ctx = mockCanvas.getContext();
    mockImageElement.naturalWidth = 88;
    mockImageElement.naturalHeight = 94;
    mockImageElement.complete = true;

    game.start();
    mockImageElement.onload && mockImageElement.onload();
    game.render();

    expect(ctx.drawImage).toHaveBeenCalledWith(
      mockImageElement,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should render placeholder at the dinosaur current position', () => {
    const ctx = mockCanvas.getContext();
    game.start();

    mockImageElement.onerror && mockImageElement.onerror();
    game.jump();
    game.update();
    game.render();

    const fillRectCalls = ctx.fillRect.mock.calls;
    const lastCall = fillRectCalls[fillRectCalls.length - 1];
    const dinoY = game.getDinosaurYPosition();

    expect(lastCall[1]).toBeCloseTo(dinoY, 0);
  });

  it('should switch from placeholder back to image if image loads after error', () => {
    const ctx = mockCanvas.getContext();
    game.start();

    mockImageElement.onerror && mockImageElement.onerror();
    game.render();
    expect(ctx.fillRect).toHaveBeenCalled();

    ctx.fillRect.mockClear();
    ctx.drawImage.mockClear();

    mockImageElement.naturalWidth = 88;
    mockImageElement.naturalHeight = 94;
    mockImageElement.onload && mockImageElement.onload();
    game.render();

    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('should display a text label on the placeholder indicating image failed', () => {
    const ctx = mockCanvas.getContext();
    game.start();

    mockImageElement.onerror && mockImageElement.onerror();
    game.render();

    expect(ctx.fillText).toHaveBeenCalled();
  });
});
