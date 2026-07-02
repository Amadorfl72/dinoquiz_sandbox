const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/game_completed', () => {
  it('should return 201 for valid payload', async () => {
    const payload = {
      app_version: '1.0.0',
      duration_ms: 120000,
      score: 7,
      questions_answered: 10
    };
    
    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);
    
    expect(res.statusCode).toEqual(201);
  });

  it('should return 400 when app_version is missing', async () => {
    const payload = {
      duration_ms: 120000,
      score: 7,
      questions_answered: 10
    };
    
    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('app_version is required');
  });

  it('should reject payload with negative duration_ms', async () => {
    const payload = {
      app_version: '1.0.0',
      duration_ms: -100,
      score: 7,
      questions_answered: 10
    };
    
    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('duration_ms cannot be negative');
  });
});