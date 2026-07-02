const request = require('supertest');
const app = require('../src/app'); // Assuming the Express app is exported from src/app.js

describe('TRIOFSND-13: Metrics Ingestion Endpoint', () => {
  const validEndpoint = '/api/metrics';

  it('should successfully ingest a valid "game_started" metric', async () => {
    const res = await request(app)
      .post(validEndpoint)
      .send({
        metric: 'game_started',
        count: 1,
        timestamp: new Date().toISOString()
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('status', 'success');
  });

  it('should successfully ingest a valid "app_open" metric', async () => {
    const res = await request(app)
      .post(validEndpoint)
      .send({
        metric: 'app_open',
        count: 1
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('status', 'success');
  });

  it('should return 400 if metric name is missing', async () => {
    const res = await request(app)
      .post(validEndpoint)
      .send({
        count: 1
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if count is missing or invalid', async () => {
    const res = await request(app)
      .post(validEndpoint)
      .send({
        metric: 'game_started',
        count: -5
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if payload contains PII (e.g., userId)', async () => {
    const res = await request(app)
      .post(validEndpoint)
      .send({
        metric: 'game_started',
        count: 1,
        userId: '12345' // PII
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });

  it('should return 400 if payload contains PII (e.g., email)', async () => {
    const res = await request(app)
      .post(validEndpoint)
      .send({
        metric: 'app_open',
        count: 1,
        email: 'test@example.com' // PII
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });
});