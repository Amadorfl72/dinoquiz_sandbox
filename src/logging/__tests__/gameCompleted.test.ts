import { logGameCompleted } from '../gameCompleted';

describe('logGameCompleted', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const payload = {
    score: 1500,
    duration_ms: 120000,
    app_version: '1.4.2',
  };

  it('sends a POST request to the events endpoint with the game_completed event', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    await logGameCompleted(payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('includes event name, score, duration_ms, and app_version in the request body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);
    await logGameCompleted(payload);
    const callArgs = mockFetch.mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.event).toBe('game_completed');
    expect(body.score).toBe(1500);
    expect(body.duration_ms).toBe(120000);
    expect(body.app_version).toBe('1.4.2');
  });

  it('does not throw when the network request fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(logGameCompleted(payload)).resolves.not.toThrow();
  });

  it('does not throw when the backend returns a non-OK status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(logGameCompleted(payload)).resolves.not.toThrow();
  });

  it('throws a validation error if score is missing', async () => {
    await expect(
      logGameCompleted({ duration_ms: 100, app_version: '1.0' } as any)
    ).rejects.toThrow(/score/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws a validation error if duration_ms is missing', async () => {
    await expect(
      logGameCompleted({ score: 100, app_version: '1.0' } as any)
    ).rejects.toThrow(/duration_ms/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws a validation error if app_version is missing', async () => {
    await expect(
      logGameCompleted({ score: 100, duration_ms: 100 } as any)
    ).rejects.toThrow(/app_version/);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});