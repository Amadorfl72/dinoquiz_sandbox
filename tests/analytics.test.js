jest.mock('../src/storage/analyticsStorage', () => ({
  storeAnalyticsEvent: jest.fn(),
}));

const { handleAnalyticsEvent } = require('../src/api/analytics');
const { storeAnalyticsEvent } = require('../src/storage/analyticsStorage');

describe('Analytics Event Tracking Integration (TRIOFSND-54)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const validEndpoint = '/api/analytics/events';

  it('should successfully store an app_open event with first_apertura flag', async () => {
    const payload = {
      eventType: 'app_open',
      timestamp: new Date().toISOString(),
      first_apertura: true,
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });

    expect(storeAnalyticsEvent).toHaveBeenCalledTimes(1);
    const stored = storeAnalyticsEvent.mock.calls[0][0];
    expect(stored.eventType).toBe('app_open');
    expect(stored.first_apertura).toBe(true);
    expect(stored.timestamp).toBe(payload.timestamp);
  });

  it('should successfully store a tooltip_shown event', async () => {
    const payload = {
      eventType: 'tooltip_shown',
      timestamp: new Date().toISOString(),
      tooltipId: 'welcome_tooltip',
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });

    expect(storeAnalyticsEvent).toHaveBeenCalledTimes(1);
    const stored = storeAnalyticsEvent.mock.calls[0][0];
    expect(stored.eventType).toBe('tooltip_shown');
    expect(stored.tooltipId).toBe('welcome_tooltip');
  });

  it('should successfully store a tooltip_dismissed event', async () => {
    const payload = {
      eventType: 'tooltip_dismissed',
      timestamp: new Date().toISOString(),
      tooltipId: 'welcome_tooltip',
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });

    expect(storeAnalyticsEvent).toHaveBeenCalledTimes(1);
    const stored = storeAnalyticsEvent.mock.calls[0][0];
    expect(stored.eventType).toBe('tooltip_dismissed');
    expect(stored.tooltipId).toBe('welcome_tooltip');
  });

  it('should reject missing eventType', async () => {
    const payload = {
      timestamp: new Date().toISOString(),
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    expect(storeAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should reject missing timestamp', async () => {
    const payload = {
      eventType: 'app_open',
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    expect(storeAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should reject payloads containing PII (email)', async () => {
    const payload = {
      eventType: 'app_open',
      timestamp: new Date().toISOString(),
      email: 'user@example.com',
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payload contains prohibited PII' });
    expect(storeAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should reject payloads containing PII (user_id)', async () => {
    const payload = {
      eventType: 'tooltip_shown',
      timestamp: new Date().toISOString(),
      user_id: '12345',
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payload contains prohibited PII' });
    expect(storeAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should reject payloads containing PII (phone)', async () => {
    const payload = {
      eventType: 'tooltip_dismissed',
      timestamp: new Date().toISOString(),
      phone: '555-1234',
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payload contains prohibited PII' });
    expect(storeAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should reject payloads containing PII nested in deviceInfo (name)', async () => {
    const payload = {
      eventType: 'app_open',
      timestamp: new Date().toISOString(),
      deviceInfo: {
        name: 'John Doe',
      },
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payload contains prohibited PII' });
    expect(storeAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('should accept payloads with deviceInfo that does not contain PII', async () => {
    const payload = {
      eventType: 'app_open',
      timestamp: new Date().toISOString(),
      first_apertura: false,
      deviceInfo: {
        userAgent: 'Mozilla/5.0',
        screenWidth: 1920,
        screenHeight: 1080,
        language: 'en-US',
      },
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(storeAnalyticsEvent).toHaveBeenCalledTimes(1);
  });

  it('should return 500 when storage fails', async () => {
    storeAnalyticsEvent.mockRejectedValueOnce(new Error('DB down'));

    const payload = {
      eventType: 'app_open',
      timestamp: new Date().toISOString(),
      first_apertura: true,
    };

    const req = { body: payload };
    const res = buildRes();

    await handleAnalyticsEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
