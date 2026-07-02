import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logGameCompleted } from '../../logging';

const ENDPOINT = '/api/logs';

describe('logGameCompleted', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a POST request to the backend logs endpoint', async () => {
    await logGameCompleted(100, 45000, '1.0.0');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('includes the event name "game_completed" in the payload', async () => {
    await logGameCompleted(100, 45000, '1.0.0');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event).toBe('game_completed');
  });

  it('includes the score in the payload', async () => {
    await logGameCompleted(250, 45000, '1.0.0');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.score).toBe(250);
  });

  it('includes duration_ms in the payload', async () => {
    await logGameCompleted(100, 12345, '1.0.0');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.duration_ms).toBe(12345);
  });

  it('includes app_version in the payload', async () => {
    await logGameCompleted(100, 45000, '1.4.2');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.app_version).toBe('1.4.2');
  });

  it('sends JSON content-type header', async () => {
    await logGameCompleted(100, 45000, '1.0.0');

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('does not throw when the request succeeds', async () => {
    await expect(
      logGameCompleted(0, 0, '1.0.0')
    ).resolves.not.toThrow();
  });

  it('swallows network errors so gameplay is not interrupted', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      logGameCompleted(100, 45000, '1.0.0')
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs an error when the backend responds with a non-OK status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await logGameCompleted(100, 45000, '1.0.0');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error logging event:',
      expect.any(Error)
    );
  });

  it('sends the full expected body structure', async () => {
    await logGameCompleted(100, 45000, '1.0.0');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      event: 'game_completed',
      score: 100,
      duration_ms: 45000,
      app_version: '1.0.0',
    });
  });
});
