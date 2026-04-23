const request = require('supertest');
const express = require('express');

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', username: 'alice', email: 'alice@test.com' };
  next();
});

process.env.JWT_SECRET = 'test-secret';

const pool = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const router = require('../../src/routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', router);

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates user and returns token', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'pass123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.username).toBe('bob');
  });

  it('returns 400 when fields missing', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 'existing' }]]);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'pass123' });
    expect(res.status).toBe(409);
  });

  it('returns 500 on db error', async () => {
    pool.query.mockRejectedValueOnce(new Error('db down'));
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bob', email: 'bob@test.com', password: 'pass123' });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs in valid user', async () => {
    pool.query.mockResolvedValueOnce([[{
      id: 'u1', name: 'alice', email: 'alice@test.com', password: 'hashed', profile_picture: null
    }]]);
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 400 when fields missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nope@test.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('returns 401 on wrong password', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 'u1', email: 'a@t.com', password: 'hashed' }]]);
    bcrypt.compare.mockResolvedValueOnce(false);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@t.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user profile', async () => {
    pool.query.mockResolvedValueOnce([[{
      id: 'user-1', username: 'alice', email: 'alice@test.com'
    }]]);
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('alice');
  });

  it('returns 404 when user not found', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(404);
  });
});
