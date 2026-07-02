global.fetch = jest.fn();

jest.mock('../src/utils/deviceInfo', () => ({
  getDeviceInfo: jest.fn(() => ({
    userAgent: 'Mozilla/5.0',
    screenWidth: 1920,
    screenHeight: 1080,
    language: 'en-US',
  })),
}));

const {
  trackAppOpen,
  trackTooltipShown,
  trackTooltipDismissed,
} = require('../src/analytics/analyticsService');
const { getDeviceInfo } = require('../src/utils/deviceInfo');

describe('Analytics Service (TRIOFSND-54)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockResolvedValue({ ok: true });
  });

  const captureBody = () => {
    const calls = fetch.mock.calls;
    const lastCall = calls[calls.length - 1];
    return JSON.parse(lastCall[1].body);
  };

  it('trackAppOpen sends app_open event with first_apertura flag', async () => {
    trackAppOpen(true);
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/analytics/events');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.eventType).toBe('app_open');
    expect(body.first_apertura).toBe(true);
    expect(body.timestamp).toBeDefined();
    expect(body.deviceInfo).toEqual({
      userAgent: 'Mozilla/5.0',
      screenWidth: 1920,
      screenHeight: 1080,
      language: 'en-US',
    });
  });

  it('trackAppOpen sends first_apertura=false when not first open', async () => {
    trackAppOpen(false);
    await Promise.resolve();

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.eventType).toBe('app_open');
    expect(body.first_apertura).toBe(false);
  });

  it('trackTooltipShown sends tooltip_shown event with tooltipId', async () => {
    trackTooltipShown('welcome_tooltip');
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.eventType).toBe('tooltip_shown');
    expect(body.tooltipId).toBe('welcome_tooltip');
    expect(body.timestamp).toBeDefined();
    expect(body.deviceInfo).toBeDefined();
  });

  it('trackTooltipDismissed sends tooltip_dismissed event with tooltipId', async () => {
    trackTooltipDismissed('welcome_tooltip');
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.eventType).toBe('tooltip_dismissed');
    expect(body.tooltipId).toBe('welcome_tooltip');
    expect(body.timestamp).toBeDefined();
    expect(body.deviceInfo).toBeDefined();
  });

  it('does not throw when fetch fails (swallows error)', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => trackAppOpen(true)).not.toThrow();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not include any PII fields in the payload', async () => {
    trackTooltipShown('welcome_tooltip');
    await Promise.resolve();

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    const piiFields = ['email', 'phone', 'address', 'name', 'user_id', 'ip'];
    piiFields.forEach((field) => {
      expect(body).not.toHaveProperty(field);
    });
  });
});
