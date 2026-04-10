const request = require('supertest');
const express = require('express');

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/grpc/clients', () => ({
  messagesClient: {},
  groupsClient:   {},
  call: jest.fn(),
  initClients: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', username: 'alice' };
  next();
});

const { call } = require('../../src/grpc/clients');
const router   = require('../../src/routes/channels');

const app = express();
app.use(express.json());
app.use('/api/groups', router);

describe('GET /api/groups/:groupId/channels', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists channels', async () => {
    const channels = [{ id: 'ch-1', name: 'general' }];
    call.mockResolvedValueOnce({ success: true, channels });

    const res = await request(app).get('/api/groups/grp-1/channels');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(channels);
  });

  it('returns 500 on gRPC error', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'DB error' });
    const res = await request(app).get('/api/groups/grp-1/channels');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/groups/:groupId/channels', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates channel and returns 201', async () => {
    const channel = { id: 'ch-2', name: 'backend' };
    call.mockResolvedValueOnce({ success: true, channel });

    const res = await request(app)
      .post('/api/groups/grp-1/channels')
      .send({ name: 'backend', description: 'Backend dev' });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(channel);
  });

  it('returns 400 when name missing', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'Nombre requerido' });
    const res = await request(app)
      .post('/api/groups/grp-1/channels')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/groups/:groupId/channels/:channelId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes channel', async () => {
    call.mockResolvedValueOnce({ success: true, message: 'Canal eliminado' });
    const res = await request(app).delete('/api/groups/grp-1/channels/ch-1');
    expect(res.status).toBe(200);
  });

  it('returns 403 when not admin', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'Solo admin' });
    const res = await request(app).delete('/api/groups/grp-1/channels/ch-1');
    expect(res.status).toBe(403);
  });
});
