import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logGameCompleted } from '../gameCompletedLogger';

const ENDPOINT = '/api/events';

describe('logGameCompleted', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a POST request to the backend events endpoint', async () => {
    await logGameCompleted({ score: 100, durationMs: 45000 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('includes the event name "game_completed" in the payload', async () => {
    await logGameCompleted({ score: 100, durationMs: 45000 });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.event).toBe('game_completed');
  });

  it('includes the score in the payload', async () => {
    await logGameCompleted({ score: 250, durationMs: 45000 });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.score).toBe(250);
  });

  it('includes duration_ms in the payload', async () => {
    await logGameCompleted({ score: 100, durationMs: 12345 });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.duration_ms).toBe(12345);
  });

  it('includes app_version in the payload', async () => {
    await logGameCompleted({ score: 100, durationMs: 45000, appVersion: '1.4.2' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.app_version).toBe('1.4.2');
  });

  it('uses the globally configured app version when not explicitly provided', async () => {
    (globalThis as any).__APP_VERSION__ = '2.0.0';
    await logGameCompleted({ score: 100, durationMs: 45000 });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.app_version).toBe('2.0.0');

    delete (globalThis as any).__APP_VERSION__;
  });

  it('sends JSON content-type header', async () => {
    await logGameCompleted({ score: 100, durationMs: 45000 });

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('does not throw when the request succeeds', async () => {
    await expect(
      logGameCompleted({ score: 0, durationMs: 0 })
    ).resolves.not.toThrow();
  });

  it('swallows network errors so gameplay is not interrupted', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      logGameCompleted({ score: 100, durationMs: 45000 })
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs a warning when the backend responds with a non-OK status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await logGameCompleted({ score: 100, durationMs: 45000 });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('game_completed'),
      expect.anything()
    );
  });

  it('rejects when score is negative', async () => {
    await expect(
      logGameCompleted({ score: -1, durationMs: 45000 })
    ).rejects.toThrow(/score/i);
  });

  it('rejects when duration_ms is negative', async () => {
    await expect(
      logGameCompleted({ score: 100, durationMs: -5 })
    ).rejects.toThrow(/duration/i);
  });

  it('rejects when app_version is missing and not globally configured', async () => {
    delete (globalThis as any).__APP_VERSION__;
    await expect(
      logGameCompleted({ score: 100, durationMs: 45000 })
    ).rejects.toThrow(/app_version/i);
  });
});
