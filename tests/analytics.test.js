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
      event_type: 'app_open',
      payload: { first_apertura: true }
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    
    const event = await db.AnalyticsEvent.findOne({ where: { event_type: 'app_open' } });
    expect(event).not.toBeNull();
    expect(event.payload.first_apertura).toBe(true);
  });

  it('should successfully store a tooltip_shown event', async () => {
    const payload = {
      event_type: 'tooltip_shown',
      payload: { tooltip_id: 'welcome_tooltip' }
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    
    const event = await db.AnalyticsEvent.findOne({ where: { event_type: 'tooltip_shown' } });
    expect(event).not.toBeNull();
    expect(event.payload.tooltip_id).toBe('welcome_tooltip');
  });

  it('should successfully store a tooltip_dismissed event', async () => {
    const payload = {
      event_type: 'tooltip_dismissed',
      payload: { tooltip_id: 'welcome_tooltip' }
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    
    const event = await db.AnalyticsEvent.findOne({ where: { event_type: 'tooltip_dismissed' } });
    expect(event).not.toBeNull();
  });

  it('should reject an invalid event type', async () => {
    const payload = {
      event_type: 'invalid_event',
      payload: {}
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject missing event_type', async () => {
    const payload = {
      payload: {}
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject payloads containing PII (email)', async () => {
    const payload = {
      event_type: 'app_open',
      payload: { first_apertura: true, email: 'user@example.com' }
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });

  it('should reject payloads containing PII (user_id)', async () => {
    const payload = {
      event_type: 'tooltip_shown',
      payload: { user_id: '12345' }
    };

    const res = await request(app).post(validEndpoint).send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });
});