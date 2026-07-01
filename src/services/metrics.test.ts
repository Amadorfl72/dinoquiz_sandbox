import { sendMetric } from './metrics';

describe('metrics service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response)
    ) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends game_started metric to the backend', async () => {
    await sendMetric({ event: 'game_started' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/metrics');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ event: 'game_started' });
  });

  it('uses application/json content type', async () => {
    await sendMetric({ event: 'game_started' });

    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
  });

  it('does not swallow network errors silently', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));

    await expect(sendMetric({ event: 'game_started' })).rejects.toThrow('network');
  });
});