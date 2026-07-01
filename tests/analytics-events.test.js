const request = require('supertest');
const { app } = require('../src/app');
const { AnalyticsEvent } = require('../src/models/analyticsEvent');
const { db } = require('../src/db');

afterEach(async () => {
  await AnalyticsEvent.destroy({ where: {} });
});

afterAll(async () => {
  await db.close();
});

describe('TRIOFSND-54: Analytics Event Tracking Integration', () => {
  describe('POST /api/analytics/events', () => {
    it('should create endpoint to receive app_open events with first_apertura flag', async () => {
      const payload = {
        event_type: 'app_open',
        first_apertura: true,
        user_id: 'user-123',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('event_type', 'app_open');
    });

    it('should store app_open event with first_apertura=true for first-time users', async () => {
      const payload = {
        event_type: 'app_open',
        first_apertura: true,
        user_id: 'user-new-001',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload)
        .expect(201);

      const storedEvent = await AnalyticsEvent.findByPk(res.body.id);
      expect(storedEvent).not.toBeNull();
      expect(storedEvent.event_type).toBe('app_open');
      expect(storedEvent.first_apertura).toBe(true);
      expect(storedEvent.user_id).toBe('user-new-001');
    });

    it('should store app_open event with first_apertura=false for returning users', async () => {
      const payload = {
        event_type: 'app_open',
        first_apertura: false,
        user_id: 'user-returning-001',
        timestamp: '2024-01-15T11:00:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload)
        .expect(201);

      const storedEvent = await AnalyticsEvent.findByPk(res.body.id);
      expect(storedEvent).not.toBeNull();
      expect(storedEvent.event_type).toBe('app_open');
      expect(storedEvent.first_apertura).toBe(false);
      expect(storedEvent.user_id).toBe('user-returning-001');
    });

    it('should create endpoint to receive tooltip_shown events', async () => {
      const payload = {
        event_type: 'tooltip_shown',
        tooltip_id: 'onboarding_tooltip_1',
        user_id: 'user-456',
        timestamp: '2024-01-15T10:35:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('event_type', 'tooltip_shown');
    });

    it('should store tooltip_shown event with tooltip identifier', async () => {
      const payload = {
        event_type: 'tooltip_shown',
        tooltip_id: 'onboarding_tooltip_1',
        user_id: 'user-456',
        timestamp: '2024-01-15T10:35:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload)
        .expect(201);

      const storedEvent = await AnalyticsEvent.findByPk(res.body.id);
      expect(storedEvent).not.toBeNull();
      expect(storedEvent.event_type).toBe('tooltip_shown');
      expect(storedEvent.tooltip_id).toBe('onboarding_tooltip_1');
      expect(storedEvent.user_id).toBe('user-456');
    });

    it('should create endpoint to receive tooltip_dismissed events', async () => {
      const payload = {
        event_type: 'tooltip_dismissed',
        tooltip_id: 'onboarding_tooltip_2',
        user_id: 'user-789',
        timestamp: '2024-01-15T10:40:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload)
        .expect('Content-Type', /json/);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('event_type', 'tooltip_dismissed');
    });

    it('should store tooltip_dismissed event with tooltip identifier', async () => {
      const payload = {
        event_type: 'tooltip_dismissed',
        tooltip_id: 'onboarding_tooltip_2',
        user_id: 'user-789',
        timestamp: '2024-01-15T10:40:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload)
        .expect(201);

      const storedEvent = await AnalyticsEvent.findByPk(res.body.id);
      expect(storedEvent).not.toBeNull();
      expect(storedEvent.event_type).toBe('tooltip_dismissed');
      expect(storedEvent.tooltip_id).toBe('onboarding_tooltip_2');
      expect(storedEvent.user_id).toBe('user-789');
    });

    it('should reject events containing PII fields (email)', async () => {
      const payload = {
        event_type: 'app_open',
        first_apertura: true,
        user_id: 'user-123',
        email: 'user@example.com',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');

      const count = await AnalyticsEvent.count({
        where: { user_id: 'user-123' },
      });
      expect(count).toBe(0);
    });

    it('should reject events containing PII fields (phone_number)', async () => {
      const payload = {
        event_type: 'tooltip_shown',
        tooltip_id: 'onboarding_tooltip_1',
        user_id: 'user-456',
        phone_number: '+1234567890',
        timestamp: '2024-01-15T10:35:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');

      const count = await AnalyticsEvent.count({
        where: { user_id: 'user-456' },
      });
      expect(count).toBe(0);
    });

    it('should reject events containing PII fields (ssn)', async () => {
      const payload = {
        event_type: 'app_open',
        first_apertura: false,
        user_id: 'user-789',
        ssn: '123-45-6789',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');

      const count = await AnalyticsEvent.count({
        where: { user_id: 'user-789' },
      });
      expect(count).toBe(0);
    });

    it('should reject events with missing event_type', async () => {
      const payload = {
        user_id: 'user-123',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject events with unknown event_type', async () => {
      const payload = {
        event_type: 'unknown_event',
        user_id: 'user-123',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject app_open events missing first_apertura flag', async () => {
      const payload = {
        event_type: 'app_open',
        user_id: 'user-123',
        timestamp: '2024-01-15T10:30:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject tooltip_shown events missing tooltip_id', async () => {
      const payload = {
        event_type: 'tooltip_shown',
        user_id: 'user-456',
        timestamp: '2024-01-15T10:35:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject tooltip_dismissed events missing tooltip_id', async () => {
      const payload = {
        event_type: 'tooltip_dismissed',
        user_id: 'user-789',
        timestamp: '2024-01-15T10:40:00Z',
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
