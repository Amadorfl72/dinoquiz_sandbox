global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
  })
);

const { startGame } = require('./gameService');

describe('TRIOFSND-14: Observability and Metrics Integration', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should send game_started metric to backend', async () => {
    await startGame();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'game_started' })
    });
  });
});