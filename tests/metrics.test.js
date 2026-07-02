const request = require('supertest');
const app = require('../src/app');

describe('TRIOFSND-13: Metrics Ingestion Endpoint', () => {
  const endpoint = '/api/metrics';

  it('should accept a valid game_started metric', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ metric: 'game_started', count: 1 });
    
    expect(res.statusCode).toEqual(202);
    expect(res.body).toHaveProperty('status', 'success');
  });

  it('should accept a valid app_open metric', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ metric: 'app_open', count: 5 });
    
    expect(res.statusCode).toEqual(202);
    expect(res.body).toHaveProperty('status', 'success');
  });

  it('should return 400 if metric field is missing', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ count: 1 });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if count field is missing', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ metric: 'game_started' });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if payload contains PII (userId)', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ metric: 'game_started', count: 1, userId: 'user-123' });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });

  it('should return 400 if payload contains PII (email)', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ metric: 'app_open', count: 2, email: 'test@test.com' });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toMatch(/PII/i);
  });

  it('should return 400 if metric is not a string', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ metric: 123, count: 1 });
    
    expect(res.statusCode).toEqual(400);
  });

  it('should return 400 if count is not a number', async () => {
    const res = await request(app)
      .post(endpoint)
      .send({ metric: 'game_started', count: '1' });
    
    expect(res.statusCode).toEqual(400);
  });
});