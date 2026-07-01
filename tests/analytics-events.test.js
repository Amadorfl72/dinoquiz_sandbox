const request = require('supertest');
const { app } = require('../src/app');
const { AnalyticsEvent } = require('../src/models');
const { sequelize } = require('../src/config/database');

describe('Analytics Event Tracking Integration (TRIOFSND-54)', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await AnalyticsEvent.destroy({ where: {}, truncate: true, cascade: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/analytics/events - Endpoint existence', () => {
    it('should have the analytics event ingestion endpoint at POST /api/analytics/events', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          event_type: 'app_open',
          user_id: 'user-123',
          first_apertura: true,
          timestamp: new Date().toISOString(),
        });
      expect(res.status).not.toBe(404);
      expect([200, 201]).toContain(res.status);
    });
  });

  describe('app_open events', () => {
    it('should store app_open event with first_apertura=true for first-time users', async () => {
      const payload = {
        event_type: 'app_open',
        user_id: 'new-user-001',
        first_apertura: true,
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'new-user-001', event_type: 'app_open' },
      });

      expect(record).not.toBeNull();
      expect(record.event_type).toBe('app_open');
      expect(record.first_apertura).toBe(true);
    });

    it('should store app_open event with first_apertura=false for returning users', async () => {
      const payload = {
        event_type: 'app_open',
        user_id: 'returning-user-002',
        first_apertura: false,
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(201);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'returning-user-002', event_type: 'app_open' },
      });

      expect(record).not.toBeNull();
      expect(record.event_type).toBe('app_open');
      expect(record.first_apertura).toBe(false);
    });

    it('should accept app_open event without first_apertura and default to false', async () => {
      const payload = {
        event_type: 'app_open',
        user_id: 'user-no-flag-003',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(201);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-no-flag-003' },
      });

      expect(record).not.toBeNull();
      expect(record.first_apertura).toBe(false);
    });
  });

  describe('tooltip_shown events', () => {
    it('should store tooltip_shown event with tooltip identifier', async () => {
      const payload = {
        event_type: 'tooltip_shown',
        user_id: 'user-tooltip-004',
        tooltip_id: 'onboarding-step-1',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(201);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-tooltip-004', event_type: 'tooltip_shown' },
      });

      expect(record).not.toBeNull();
      expect(record.event_type).toBe('tooltip_shown');
      expect(record.tooltip_id).toBe('onboarding-step-1');
    });

    it('should store tooltip_shown event with different tooltip identifiers', async () => {
      const tooltipIds = ['dashboard-help', 'settings-tip', 'profile-guide'];

      for (const tooltipId of tooltipIds) {
        const res = await request(app)
          .post('/api/analytics/events')
          .send({
            event_type: 'tooltip_shown',
            user_id: 'user-multi-tooltip-005',
            tooltip_id: tooltipId,
            timestamp: new Date().toISOString(),
          });

        expect(res.status).toBe(201);
      }

      const records = await AnalyticsEvent.findAll({
        where: { user_id: 'user-multi-tooltip-005', event_type: 'tooltip_shown' },
      });

      expect(records).toHaveLength(3);
      const storedIds = records.map((r) => r.tooltip_id).sort();
      expect(storedIds).toEqual([...tooltipIds].sort());
    });
  });

  describe('tooltip_dismissed events', () => {
    it('should store tooltip_dismissed event with tooltip identifier', async () => {
      const payload = {
        event_type: 'tooltip_dismissed',
        user_id: 'user-dismiss-006',
        tooltip_id: 'onboarding-step-2',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(201);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-dismiss-006', event_type: 'tooltip_dismissed' },
      });

      expect(record).not.toBeNull();
      expect(record.event_type).toBe('tooltip_dismissed');
      expect(record.tooltip_id).toBe('onboarding-step-2');
    });

    it('should store tooltip_dismissed event with different tooltip identifiers', async () => {
      const payload = {
        event_type: 'tooltip_dismissed',
        user_id: 'user-dismiss-007',
        tooltip_id: 'feature-highlight-1',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(201);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-dismiss-007', event_type: 'tooltip_dismissed' },
      });

      expect(record).not.toBeNull();
      expect(record.tooltip_id).toBe('feature-highlight-1');
    });
  });

  describe('PII rejection', () => {
    it('should reject events containing email field (PII)', async () => {
      const payload = {
        event_type: 'app_open',
        user_id: 'user-pii-008',
        first_apertura: true,
        email: 'user@example.com',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-pii-008' },
      });
      expect(record).toBeNull();
    });

    it('should reject events containing phone_number field (PII)', async () => {
      const payload = {
        event_type: 'tooltip_shown',
        user_id: 'user-pii-009',
        tooltip_id: 'some-tooltip',
        phone_number: '+1234567890',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-pii-009' },
      });
      expect(record).toBeNull();
    });

    it('should reject events containing ssn field (PII)', async () => {
      const payload = {
        event_type: 'tooltip_dismissed',
        user_id: 'user-pii-010',
        tooltip_id: 'some-tooltip',
        ssn: '123-45-6789',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-pii-010' },
      });
      expect(record).toBeNull();
    });

    it('should reject events containing nested PII in metadata', async () => {
      const payload = {
        event_type: 'app_open',
        user_id: 'user-pii-011',
        first_apertura: true,
        metadata: {
          email: 'nested@example.com',
        },
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-pii-011' },
      });
      expect(record).toBeNull();
    });

    it('should reject events containing full_name field (PII)', async () => {
      const payload = {
        event_type: 'app_open',
        user_id: 'user-pii-012',
        first_apertura: false,
        full_name: 'John Doe',
        timestamp: new Date().toISOString(),
      };

      const res = await request(app)
        .post('/api/analytics/events')
        .send(payload);

      expect(res.status).toBe(400);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-pii-012' },
      });
      expect(record).toBeNull();
    });
  });

  describe('Validation and error handling', () => {
    it('should reject events with missing event_type', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          user_id: 'user-validation-013',
          timestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('should reject events with missing user_id', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          event_type: 'app_open',
          first_apertura: true,
          timestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('should reject events with unknown event_type', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          event_type: 'unknown_event',
          user_id: 'user-validation-014',
          timestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('should reject events with empty body', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should accept events with optional timestamp and store it', async () => {
      const ts = new Date().toISOString();
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          event_type: 'app_open',
          user_id: 'user-timestamp-015',
          first_apertura: true,
          timestamp: ts,
        });

      expect(res.status).toBe(201);

      const record = await AnalyticsEvent.findOne({
        where: { user_id: 'user-timestamp-015' },
      });

      expect(record).not.toBeNull();
      expect(new Date(record.timestamp).toISOString()).toBe(ts);
    });
  });
});
