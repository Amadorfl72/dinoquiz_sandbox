const request = require('supertest');
const app = require('../app'); // Assuming the Express app is exported from app.js

describe('POST /events/game_completed', () => {
  const validPayload = {
    score: 1500,
    duration_ms: 120000,
    app_version: '1.0.0'
  };

  it('should return 201 Created for a valid payload', async () => {
    const res = await request(app)
      .post('/events/game_completed')
      .send(validPayload)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(res.body).toHaveProperty('status', 'success');
  });

  it('should return 400 Bad Request if score is missing', async () => {
    const payload = { ...validPayload, score: undefined };
    const res = await request(app)
      .post('/events/game_completed')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 Bad Request if duration_ms is missing', async () => {
    const payload = { ...validPayload, duration_ms: undefined };
    const res = await request(app)
      .post('/events/game_completed')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 Bad Request if app_version is missing', async () => {
    const payload = { ...validPayload, app_version: undefined };
    const res = await request(app)
      .post('/events/game_completed')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 Bad Request if score is not a number', async () => {
    const payload = { ...validPayload, score: '1500' };
    const res = await request(app)
      .post('/events/game_completed')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 Bad Request if duration_ms is not a number', async () => {
    const payload = { ...validPayload, duration_ms: '120000' };
    const res = await request(app)
      .post('/events/game_completed')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 Bad Request if app_version is not a string', async () => {
    const payload = { ...validPayload, app_version: 100 };
    const res = await request(app)
      .post('/events/game_completed')
      .send(payload)
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});