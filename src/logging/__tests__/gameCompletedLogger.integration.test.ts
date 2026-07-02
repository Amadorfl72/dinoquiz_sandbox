import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { logGameCompleted } from '../gameCompletedLogger';

const server = setupServer(
  http.post('/api/events', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ received: true }, { status: 200 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('logGameCompleted integration', () => {
  it('successfully posts a well-formed game_completed event', async () => {
    const result = await logGameCompleted({
      score: 500,
      durationMs: 30000,
      appVersion: '3.1.0',
    });

    expect(result).toBeUndefined();
  });

  it('handles a 503 backend response gracefully', async () => {
    server.use(
      http.post('/api/events', () =>
        HttpResponse.json({ error: 'unavailable' }, { status: 503 })
      )
    );

    await expect(
      logGameCompleted({ score: 500, durationMs: 30000, appVersion: '3.1.0' })
    ).resolves.not.toThrow();
  });
});
