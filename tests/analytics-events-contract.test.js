const request = require('supertest');
const { app } = require('../src/app');
const { AnalyticsEvent } = require('../src/models');
const { sequelize } = require('../src/config/database');

describe('Analytics Events - Contract & Integration (TRIOFSND-54)', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterEach(async () => {
    await AnalyticsEvent.destroy({ where: {}, truncate: true, cascade: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Response format', () => {
    it('should return 201 with event id and event_type in response body', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          event_type: 'app_open',
          user_id: 'contract-user-001',
          first_apertura: true,
          timestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('event_type', 'app_open');
      expect(res.body).toHaveProperty('user_id', 'contract-user-001');
      expect(res.body).toHaveProperty('received_at');
    });
  });

  describe('Multiple event types in sequence', () => {
    it('should store a sequence of mixed event types for the same user', async () => {
      const userId = 'sequence-user-002';
      const events = [
        { event_type: 'app_open', first_apertura: true },
        { event_type: 'tooltip_shown', tooltip_id: 'tip-1' },
        { event_type: 'tooltip_dismissed', tooltip_id: 'tip-1' },
        { event_type: 'tooltip_shown', tooltip_id: 'tip-2' },
        { event_type: 'tooltip_dismissed', tooltip_id: 'tip-2' },
        { event_type: 'app_open', first_apertura: false },
      ];

      for (const evt of events) {
        const res = await request(app)
          .post('/api/analytics/events')
          .send({
            ...evt,
            user_id: userId,
            timestamp: new Date().toISOString(),
          });
        expect(res.status).toBe(201);
      }

      const records = await AnalyticsEvent.findAll({
        where: { user_id: userId },
        order: [['createdAt', 'ASC']],
      });

      expect(records).toHaveLength(6);
      expect(records[0].event_type).toBe('app_open');
      expect(records[0].first_apertura).toBe(true);
      expect(records[1].event_type).toBe('tooltip_shown');
      expect(records[1].tooltip_id).toBe('tip-1');
      expect(records[2].event_type).toBe('tooltip_dismissed');
      expect(records[2].tooltip_id).toBe('tip-1');
      expect(records[5].event_type).toBe('app_open');
      expect(records[5].first_apertura).toBe(false);
    });
  });

  describe('PII field detection - comprehensive list', () => {
    const piiFields = [
      { field: 'email', value: 'test@example.com' },
      { field: 'phone', value: '+1234567890' },
      { field: 'phone_number', value: '+1234567890' },
      { field: 'ssn', value: '123-45-6789' },
      { field: 'full_name', value: 'Jane Doe' },
      { field: 'first_name', value: 'Jane' },
      { field: 'last_name', value: 'Doe' },
      { field: 'address', value: '123 Main St' },
      { field: 'date_of_birth', value: '1990-01-01' },
      { field: 'password', value: 'secret123' },
    ];

    piiFields.forEach(({ field, value }) => {
      it(`should reject events containing ${field} field`, async () => {
        const res = await request(app)
          .post('/api/analytics/events')
          .send({
            event_type: 'app_open',
            user_id: `pii-test-${field}`,
            first_apertura: true,
            [field]: value,
            timestamp: new Date().toISOString(),
          });

        expect(res.status).toBe(400);

        const record = await AnalyticsEvent.findOne({
          where: { user_id: `pii-test-${field}` },
        });
        expect(record).toBeNull();
      });
    });
  });

  describe('tooltip events require tooltip_id', () => {
    it('should reject tooltip_shown event without tooltip_id', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          event_type: 'tooltip_shown',
          user_id: 'tooltip-validation-003',
          timestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });

    it('should reject tooltip_dismissed event without tooltip_id', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({
          event_type: 'tooltip_dismissed',
          user_id: 'tooltip-validation-004',
          timestamp: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
    });
  });
});
