import request from 'supertest';
import app from '../src/app';
import { AnalyticsEvent } from '../src/models/AnalyticsEvent';

describe('Analytics Events API', () => {
  beforeEach(async () => {
    await AnalyticsEvent.deleteMany({});
  });

  describe('POST /api/analytics/events', () => {
    it('should create endpoint to receive app_open events with first_apertura flag', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'app_open',
          payload: { first_apertura: true },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      expect(response.status).toBe(201);
      expect(response.body.eventType).toBe('app_open');
      expect(response.body.payload.first_apertura).toBe(true);
      
      const dbEvent = await AnalyticsEvent.findOne({ eventType: 'app_open' });
      expect(dbEvent).toBeTruthy();
      expect(dbEvent?.payload.first_apertura).toBe(true);
    });

    it('should store app_open event with first_apertura=true for first-time users', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'app_open',
          payload: { first_apertura: true },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      const dbEvent = await AnalyticsEvent.findOne({ eventType: 'app_open' });
      expect(dbEvent?.payload.first_apertura).toBe(true);
    });

    it('should store app_open event with first_apertura=false for returning users', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'app_open',
          payload: { first_apertura: false },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      const dbEvent = await AnalyticsEvent.findOne({ eventType: 'app_open' });
      expect(dbEvent?.payload.first_apertura).toBe(false);
    });

    it('should create endpoint to receive tooltip_shown events', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'tooltip_shown',
          payload: { tooltip_id: 'welcome_tooltip' },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      expect(response.status).toBe(201);
      expect(response.body.eventType).toBe('tooltip_shown');
      expect(response.body.payload.tooltip_id).toBe('welcome_tooltip');
    });

    it('should store tooltip_shown event with tooltip identifier', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'tooltip_shown',
          payload: { tooltip_id: 'welcome_tooltip' },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      const dbEvent = await AnalyticsEvent.findOne({ eventType: 'tooltip_shown' });
      expect(dbEvent?.payload.tooltip_id).toBe('welcome_tooltip');
    });

    it('should create endpoint to receive tooltip_dismissed events', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'tooltip_dismissed',
          payload: { tooltip_id: 'welcome_tooltip' },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      expect(response.status).toBe(201);
      expect(response.body.eventType).toBe('tooltip_dismissed');
      expect(response.body.payload.tooltip_id).toBe('welcome_tooltip');
    });

    it('should store tooltip_dismissed event with tooltip identifier', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'tooltip_dismissed',
          payload: { tooltip_id: 'welcome_tooltip' },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      const dbEvent = await AnalyticsEvent.findOne({ eventType: 'tooltip_dismissed' });
      expect(dbEvent?.payload.tooltip_id).toBe('welcome_tooltip');
    });

    it('should reject events containing PII fields', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({
          eventType: 'app_open',
          payload: { first_apertura: true, email: 'user@example.com' },
          deviceInfo: { userAgent: 'test', screenSize: '1024x768', language: 'es' }
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('prohibited PII field');
      
      const dbEvent = await AnalyticsEvent.findOne({});
      expect(dbEvent).toBeNull();
    });
  });
});