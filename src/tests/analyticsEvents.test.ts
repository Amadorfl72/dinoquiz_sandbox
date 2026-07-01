import request from 'supertest';
import app from '../app';
import { AnalyticsEvent } from '../models/AnalyticsEvent';

beforeEach(async () => {
  await AnalyticsEvent.deleteMany({});
});

describe('Analytics Event Tracking', () => {
  it('should create endpoint to receive app_open events with first_apertura flag', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'app_open',
        first_apertura: true,
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    expect(response.status).toBe(201);
    
    const event = await AnalyticsEvent.findOne({ eventType: 'app_open' });
    expect(event).toBeTruthy();
    expect(event?.firstApertura).toBe(true);
  });

  it('should store app_open event with first_apertura=true for first-time users', async () => {
    await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'app_open',
        first_apertura: true,
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    const event = await AnalyticsEvent.findOne({ eventType: 'app_open' });
    expect(event?.firstApertura).toBe(true);
  });

  it('should store app_open event with first_apertura=false for returning users', async () => {
    await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'app_open',
        first_apertura: false,
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    const event = await AnalyticsEvent.findOne({ eventType: 'app_open' });
    expect(event?.firstApertura).toBe(false);
  });

  it('should create endpoint to receive tooltip_shown events', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'tooltip_shown',
        tooltip_id: 'welcome_tooltip',
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    expect(response.status).toBe(201);
    
    const event = await AnalyticsEvent.findOne({ eventType: 'tooltip_shown' });
    expect(event).toBeTruthy();
    expect(event?.tooltipId).toBe('welcome_tooltip');
  });

  it('should store tooltip_shown event with tooltip identifier', async () => {
    await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'tooltip_shown',
        tooltip_id: 'welcome_tooltip',
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    const event = await AnalyticsEvent.findOne({ eventType: 'tooltip_shown' });
    expect(event?.tooltipId).toBe('welcome_tooltip');
  });

  it('should create endpoint to receive tooltip_dismissed events', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'tooltip_dismissed',
        tooltip_id: 'welcome_tooltip',
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    expect(response.status).toBe(201);
    
    const event = await AnalyticsEvent.findOne({ eventType: 'tooltip_dismissed' });
    expect(event).toBeTruthy();
    expect(event?.tooltipId).toBe('welcome_tooltip');
  });

  it('should store tooltip_dismissed event with tooltip identifier', async () => {
    await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'tooltip_dismissed',
        tooltip_id: 'welcome_tooltip',
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    const event = await AnalyticsEvent.findOne({ eventType: 'tooltip_dismissed' });
    expect(event?.tooltipId).toBe('welcome_tooltip');
  });

  it('should reject events containing PII fields', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        eventType: 'app_open',
        first_apertura: true,
        email: 'child@example.com',
        device_info: {
          model: 'iPad7,5',
          os_version: '15.4',
          language: 'es',
          screen_size: '1024x768',
          user_agent: 'Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1'
        },
        session_id: 'session123'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('prohibited PII fields');
    
    const event = await AnalyticsEvent.findOne({ eventType: 'app_open' });
    expect(event).toBeNull();
  });
});