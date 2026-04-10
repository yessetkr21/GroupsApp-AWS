const request = require('supertest');
const express = require('express');

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), http: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  getCachedMessages: jest.fn().mockResolvedValue(null),
  cacheMessages:     jest.fn().mockResolvedValue(undefined),
  connect:           jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/grpc/clients', () => ({
  messagesClient: {},
  groupsClient:   {},
  call: jest.fn(),
  initClients: jest.fn().mockResolvedValue(undefined),
}));

// Mock auth middleware — inject a fake user
jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', username: 'alice' };
  next();
});

const { call } = require('../../src/grpc/clients');
const redis     = require('../../src/config/redis');
const router    = require('../../src/routes/messages');

const app = express();
app.use(express.json());
app.use('/api/messages', router);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/messages/group/:groupId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns cached messages when cache hit', async () => {
    const cached = [{ id: 'msg-1', content: 'hello' }];
    redis.getCachedMessages.mockResolvedValueOnce(cached);

    const res = await request(app).get('/api/messages/group/grp-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(cached);
    expect(res.body.cached).toBe(true);
    expect(call).not.toHaveBeenCalled();
  });

  it('calls gRPC and caches result on cache miss', async () => {
    const messages = [{ id: 'msg-2', content: 'world' }];
    call.mockResolvedValueOnce({ success: true, messages });

    const res = await request(app).get('/api/messages/group/grp-1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(messages);
    expect(redis.cacheMessages).toHaveBeenCalledWith('group:grp-1', messages);
  });

  it('skips cache for paginated requests (before param)', async () => {
    const messages = [{ id: 'msg-3' }];
    call.mockResolvedValueOnce({ success: true, messages });

    const res = await request(app).get('/api/messages/group/grp-1?before=2024-01-01');
    expect(res.status).toBe(200);
    expect(redis.getCachedMessages).not.toHaveBeenCalled();
    expect(redis.cacheMessages).not.toHaveBeenCalled();
  });

  it('returns 500 when gRPC fails', async () => {
    call.mockResolvedValueOnce({ success: false, error: 'DB error' });

    const res = await request(app).get('/api/messages/group/grp-1');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/messages/channel/:channelId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns channel messages', async () => {
    const messages = [{ id: 'msg-4', channel_id: 'ch-1' }];
    call.mockResolvedValueOnce({ success: true, messages });

    const res = await request(app).get('/api/messages/channel/ch-1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(messages);
    expect(redis.cacheMessages).toHaveBeenCalledWith('channel:ch-1', messages);
  });
});

describe('GET /api/messages/dm/:userId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns DM messages with correct sorted cache key', async () => {
    const messages = [{ id: 'dm-1' }];
    call.mockResolvedValueOnce({ success: true, messages });

    const res = await request(app).get('/api/messages/dm/user-2');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(messages);
    // sorted: user-1 < user-2
    expect(redis.cacheMessages).toHaveBeenCalledWith('dm:user-1:user-2', messages);
  });
});
