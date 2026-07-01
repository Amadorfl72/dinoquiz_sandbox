const request = require('supertest');
const app = require('../app');
const db = require('../models');

describe('Analytics Event Tracking Integration (TRIOFSND-54)', () => {
  beforeEach(async () => {
    if (db.AnalyticsEvent) {
      await db.AnalyticsEvent.destroy({ where: {}, truncate: true });
    }
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const validEvents = [
    {
      type: 'app_open',
      payload: { first_apertura: true },
      description: 'app_open with first_apertura true'
    },
    {
      type: 'app_open',
      payload: { first_apertura: false },
      description: 'app_open with first_apertura false'
    },
    {
      type: 'tooltip_shown',
      payload: { tooltip_id: 'help_button' },
      description: 'tooltip_shown event'
    },
    {
      type: 'tooltip_dismissed',
      payload: { tooltip_id: 'help_button' },
      description: 'tooltip_dismissed event'
    }
  ];

  validEvents.forEach(({ type, payload, description }) => {
    it(`should successfully receive and store ${description}`, async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({ type, payload });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);

      const storedEvent = await db.AnalyticsEvent.findOne({ where: { type } });
      expect(storedEvent).not.toBeNull();
      expect(storedEvent.type).toBe(type);
      expect(storedEvent.payload).toMatchObject(payload);
    });
  });

  it('should return 400 if event type is invalid', async () => {
    const res = await request(app)
      .post('/api/analytics/events')
      .send({ type: 'invalid_event', payload: {} });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if app_open event is missing first_apertura flag', async () => {
    const res = await request(app)
      .post('/api/analytics/events')
      .send({ type: 'app_open', payload: {} });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject payloads containing PII (e.g., email, user_id)', async () => {
    const res = await request(app)
      .post('/api/analytics/events')
      .send({
        type: 'tooltip_shown',
        payload: {
          tooltip_id: 'help_button',
          email: 'test@example.com',
          user_id: 12345
        }
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });

  it('should reject payloads containing PII in nested objects', async () => {
    const res = await request(app)
      .post('/api/analytics/events')
      .send({
        type: 'tooltip_shown',
        payload: {
          tooltip_id: 'help_button',
          user_info: {
            name: 'John Doe',
            phone: '555-1234'
          }
        }
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });
});