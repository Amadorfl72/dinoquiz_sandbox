import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { sendMetric } from './metrics';

const server = setupServer(
  rest.post('/metrics', async (req, res, ctx) => {
    const body = await req.json();
    return res(ctx.status(200), ctx.json({ received: body }));
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('metrics integration', () => {
  it('POSTs game_started to /metrics', async () => {
    const handler = jest.fn((req, res, ctx) =>
      res(ctx.status(200), ctx.json({ ok: true }))
    );
    server.use(rest.post('/metrics', handler));

    await sendMetric({ event: 'game_started' });

    expect(handler).toHaveBeenCalledTimes(1);
    const request = handler.mock.calls[0][0];
    await expect(request.json()).resolves.toEqual({ event: 'game_started' });
  });
});