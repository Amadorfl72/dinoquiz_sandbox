const request = require('supertest');
const app = require('../app');
const db = require('../models');

describe('Analytics Event Tracking Integration (TRIOFSND-54)', () => {
  beforeEach(async () => {
    await db.AnalyticsEvent.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const validEndpoint = '/api/analytics/events';

  it('should successfully store an app_open event with first_apertura flag', async () => {
    const payload = {
      eventType: 'app_open',
      timestamp: new Date().toISOString(),
      first_apertura: true
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    
    const event = await db.AnalyticsEvent.findOne({ where: { eventType: 'app_open' } });
    expect(event).not.toBeNull();
    expect(event.first_apertura).toBe(true);
  });

  it('should successfully store a tooltip_shown event', async () => {
    const payload = {
      eventType: 'tooltip_shown',
      timestamp: new Date().toISOString(),
      tooltipId: 'welcome_tooltip'
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    
    const event = await db.AnalyticsEvent.findOne({ where: { eventType: 'tooltip_shown' } });
    expect(event).not.toBeNull();
    expect(event.tooltipId).toBe('welcome_tooltip');
  });

  it('should successfully store a tooltip_dismissed event', async () => {
    const payload = {
      eventType: 'tooltip_dismissed',
      timestamp: new Date().toISOString(),
      tooltipId: 'welcome_tooltip'
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    
    const event = await db.AnalyticsEvent.findOne({ where: { eventType: 'tooltip_dismissed' } });
    expect(event).not.toBeNull();
  });

  it('should reject an invalid event type', async () => {
    const payload = {
      eventType: 'invalid_event',
      timestamp: new Date().toISOString()
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject missing eventType', async () => {
    const payload = {
      timestamp: new Date().toISOString()
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject payloads containing PII (email)', async () => {
    const payload = {
      eventType: 'app_open',
      timestamp: new Date().toISOString(),
      email: 'user@example.com'
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });

  it('should reject payloads containing PII (user_id)', async () => {
    const payload = {
      eventType: 'tooltip_shown',
      timestamp: new Date().toISOString(),
      user_id: '12345'
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });
});