const alertRules = require('../src/utils/alertRules.json');

describe('alertRules.json', () => {
  it('contains an alerts array', () => {
    expect(Array.isArray(alertRules.alerts)).toBe(true);
    expect(alertRules.alerts.length).toBeGreaterThanOrEqual(2);
  });

  it('defines high_drop_off alert with >5% condition', () => {
    const highDropOff = alertRules.alerts.find(a => a.name === 'high_drop_off');
    expect(highDropOff).toBeDefined();
    expect(highDropOff.condition).toContain('drop_off_rate > 5');
    expect(highDropOff.notification_channels).toContain('email');
    expect(highDropOff.notification_channels).toContain('slack');
    expect(highDropOff.severity).toBe('warning');
  });

  it('defines low_hit_rate alert with <40% condition', () => {
    const lowHitRate = alertRules.alerts.find(a => a.name === 'low_hit_rate');
    expect(lowHitRate).toBeDefined();
    expect(lowHitRate.condition).toContain('hit_rate < 40');
    expect(lowHitRate.notification_channels).toContain('email');
    expect(lowHitRate.notification_channels).toContain('slack');
    expect(lowHitRate.severity).toBe('error');
  });
});
