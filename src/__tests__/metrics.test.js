describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  let mockFetch;
  let startGame;

  beforeEach(() => {
    mockFetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = mockFetch;
    
    // Dynamically require to ensure fetch mock is in place
    const gameModule = require('../game');
    startGame = gameModule.startGame;
  });

  afterEach(() => {
    jest.resetModules();
    delete global.fetch;
  });

  it('should send game_started metric to backend', async () => {
    await startGame();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event: 'game_started' }),
    });
  });
});