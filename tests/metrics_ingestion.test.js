const request = require('supertest');
const app = require('../src/app');

describe('TRIOFSND-13: Metrics Ingestion Endpoint', () => {
  const endpoint = '/api/metrics';

  describe('POST /api/metrics', () => {
    it('should successfully ingest a valid "game_started" metric and return 201', async () => {
      const payload = {
        event: 'game_started',
        count: 1,
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should successfully ingest a valid "app_open" metric and return 201', async () => {
      const payload = {
        event: 'app_open',
        count: 5,
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
    });

    it('should return 400 if event name is missing', async () => {
      const payload = {
        count: 1,
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if count is missing', async () => {
      const payload = {
        event: 'game_started',
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject payload containing PII (email) with 400', async () => {
      const payload = {
        event: 'game_started',
        count: 1,
        email: 'user@example.com'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/PII/i);
    });

    it('should reject payload containing PII (user_id) with 400', async () => {
      const payload = {
        event: 'app_open',
        count: 1,
        user_id: '12345'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/PII/i);
    });

    it('should reject payload containing PII (ip_address) with 400', async () => {
      const payload = {
        event: 'app_open',
        count: 1,
        ip_address: '192.168.1.1'
      };

      const response = await request(app)
        .post(endpoint)
        .send(payload)
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/PII/i);
    });
  });
});
