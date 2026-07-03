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
    expect(res.body).toHaveProperty('error');
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

  it('should return 400 when app_version is only whitespace', async () => {
    const payload = {
      ...validPayload,
      app_version: '   '
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('app_version is required');
  });

  it('should return 400 when app_version is not a string', async () => {
    const payload = {
      ...validPayload,
      app_version: 123
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
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('duration_ms cannot be negative');
  });

  it('should reject payload with a large negative duration_ms', async () => {
    const payload = {
      app_version: '1.0.0',
      duration_ms: -999999,
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

  it('should reject payload when duration_ms is not a number', async () => {
    const payload = {
      ...validPayload,
      duration_ms: 'not-a-number'
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('duration_ms must be a number');
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
    expect(res.body.error).toContain('score is required');
  });

  it('should return 400 when score is out of range (above max)', async () => {
    const payload = {
      ...validPayload,
      score: 11
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('score must be between 0 and 10');
  });

  it('should return 400 when score is out of range (below min)', async () => {
    const payload = {
      ...validPayload,
      score: -1
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('score must be between 0 and 10');
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
    expect(res.body.error).toContain('questions_answered is required');
  });

  it('should return 400 when questions_answered is out of range (above max)', async () => {
    const payload = {
      ...validPayload,
      questions_answered: 11
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('questions_answered must be between 0 and 10');
  });

  it('should return 400 when questions_answered is out of range (below min)', async () => {
    const payload = {
      ...validPayload,
      questions_answered: -1
    };

    const res = await request(app)
      .post('/api/game_completed')
      .send(payload);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('questions_answered must be between 0 and 10');
  });

  it('should return 400 for an empty payload', async () => {
    const res = await request(app)
      .post('/api/game_completed')
      .send({});

    expect(res.statusCode).toEqual(400);
  });

  it('should return 400 for a payload missing multiple required fields', async () => {
    const res = await request(app)
      .post('/api/game_completed')
      .send({ app_version: '1.0.0' });

    expect(res.statusCode).toEqual(400);
  });

  it('should return 400 when no body is sent', async () => {
    const res = await request(app)
      .post('/api/game_completed')
      .send();

    expect(res.statusCode).toEqual(400);
  });

  it('should return 201 and acknowledge the event for a valid full payload', async () => {
    const res = await request(app)
      .post('/api/game_completed')
      .send(validPayload);

    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toEqual('Event received');
  });
});
