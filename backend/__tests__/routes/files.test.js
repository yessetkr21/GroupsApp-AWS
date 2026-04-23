const request = require('supertest');
const express = require('express');

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', username: 'alice' };
  next();
});

jest.mock('../../src/config/s3', () => ({
  s3Client: { send: jest.fn() },
  bucketName: 'test-bucket',
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const { s3Client } = require('../../src/config/s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const router = require('../../src/routes/files');

process.env.AWS_REGION = 'us-east-1';

const app = express();
app.use(express.json());
app.use('/api/files', router);

describe('POST /api/files/upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads file to S3 and returns url', async () => {
    s3Client.send.mockResolvedValueOnce({});

    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', Buffer.from('hello'), 'test.txt');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toMatch(/^https:\/\/test-bucket\.s3\./);
    expect(res.body.data.name).toBe('test.txt');
  });

  it('returns 400 when no file sent', async () => {
    const res = await request(app).post('/api/files/upload');
    expect(res.status).toBe(400);
  });

  it('returns 500 on S3 error', async () => {
    s3Client.send.mockRejectedValueOnce(new Error('S3 down'));
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', Buffer.from('x'), 'f.txt');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/files/signed-url/*', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns presigned URL', async () => {
    getSignedUrl.mockResolvedValueOnce('https://signed-url');
    const res = await request(app).get('/api/files/signed-url/uploads/abc.jpg');
    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe('https://signed-url');
  });

  it('returns 500 on sign error', async () => {
    getSignedUrl.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/api/files/signed-url/uploads/abc.jpg');
    expect(res.status).toBe(500);
  });
});
