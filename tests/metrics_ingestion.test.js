const request = require('supertest');
const app = require('../src/app');

describe('TRIOFSND-13: Metrics Ingestion Endpoint', () => {
  const endpoint = '/metrics';

  describe('POST /metrics', () => {
    it('should successfully ingest a valid "game_started" metric and return 200', async () => {
      const payload = {
        event: 'game_started'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should successfully ingest a valid "app_open" metric and return 200', async () => {
      const payload = {
        event: 'app_open'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should return 400 if event name is missing', async () => {
      const payload = {};

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid event types with 400', async () => {
      const payload = {
        event: 'invalid_event'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid event type/i);
    });

    it('should reject payload containing PII (email) with 400', async () => {
      const payload = {
        event: 'game_started',
        email: 'user@example.com'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/sensitive information/i);
    });

    it('should reject payload containing PII (user_id) with 400', async () => {
      const payload = {
        event: 'app_open',
        user_id: '12345'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/sensitive information/i);
    });

    it('should reject payload containing PII (ip_address) with 400', async () => {
      const payload = {
        event: 'app_open',
        ip_address: '192.168.1.1'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/sensitive information/i);
    });
  });

  describe('GET /metrics/summary', () => {
    it('should return metrics summary', async () => {
      const response = await request(app)
        .get('/metrics/summary')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('game_started');
      expect(response.body.metrics).toHaveProperty('app_open');
    });
  });
});