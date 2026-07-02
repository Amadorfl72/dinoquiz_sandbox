const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/game_completed', () => {
  const validPayload = {
    app_version: '1.0.0',
    duration_ms: 120000,
    score: 7,
    questions_answered: 10
  };

  it('should return 201 for valid payload', async () => {
    const res = await request(app)
      .post('/api/game_completed')
      .send(validPayload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message');
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

  it('should return 400 when app_version is an empty string', async () => {
    const payload = {
      ...validPayload,
      app_version: ''
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

  it('should reject payload with missing duration_ms', async () => {
    const payload = {
      app_version: '1.0.0',
      score: 7,
      questions_answered: 10
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('duration_ms is required');
  });

  it('should accept payload with duration_ms of 0', async () => {
    const payload = {
      ...validPayload,
      duration_ms: 0
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(201);
  });

  it('should return 400 when score is missing', async () => {
    const payload = {
      app_version: '1.0.0',
      duration_ms: 120000,
      questions_answered: 10
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
  });

  it('should return 400 when score is out of range', async () => {
    const payload = {
      ...validPayload,
      score: 11
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
  });

  it('should return 400 when questions_answered is missing', async () => {
    const payload = {
      app_version: '1.0.0',
      duration_ms: 120000,
      score: 7
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
  });

  it('should return 400 when questions_answered is out of range', async () => {
    const payload = {
      ...validPayload,
      questions_answered: 11
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
  });

  it('should return 400 for an empty payload', async () => {
    const res = await request(app)
      .post('/api/game_completed')
      .send({});

    expect(res.statusCode).toEqual(400);
  });
});
