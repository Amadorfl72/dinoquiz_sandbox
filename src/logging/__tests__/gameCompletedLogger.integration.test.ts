import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { logGameCompleted } from '../logging';

const server = setupServer(
  http.post('/api/logs', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ received: true }, { status: 200 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('logGameCompleted integration', () => {
  it('successfully posts a well-formed game_completed event', async () => {
    const result = await logGameCompleted(500, 30000, '3.1.0');

    expect(result).toBeUndefined();
  });

  it('handles a 503 backend response gracefully', async () => {
    server.use(
      http.post('/api/logs', () =>
        HttpResponse.json({ error: 'unavailable' }, { status: 503 })
      )
    );

    await expect(
      logGameCompleted(500, 30000, '3.1.0')
    ).resolves.not.toThrow();
  });
});