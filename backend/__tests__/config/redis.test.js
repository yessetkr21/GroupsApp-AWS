/**
 * Tests for backend/src/config/redis.js
 * Mocks ioredis so no real Redis connection is needed.
 */

const eventHandlers = {};

const pipelineMock = {
  del:    jest.fn().mockReturnThis(),
  rpush:  jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec:   jest.fn().mockResolvedValue([]),
};

const mockClient = {
  connect:   jest.fn().mockResolvedValue(undefined),
  sadd:      jest.fn().mockResolvedValue(1),
  srem:      jest.fn().mockResolvedValue(1),
  sismember: jest.fn().mockResolvedValue(0),
  smembers:  jest.fn().mockResolvedValue([]),
  set:       jest.fn().mockResolvedValue('OK'),
  get:       jest.fn().mockResolvedValue(null),
  del:       jest.fn().mockResolvedValue(1),
  lrange:    jest.fn().mockResolvedValue([]),
  pipeline:  jest.fn().mockReturnValue(pipelineMock),
  on: jest.fn((event, cb) => {
    eventHandlers[event] = cb;
    return mockClient;
  }),
};

jest.mock('ioredis', () => jest.fn(() => mockClient));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

const redis = require('../../src/config/redis');

// Connect once and fire the 'connect' event so isConnected() returns true
beforeAll(async () => {
  await redis.connect();
  // Simulate the ioredis 'connect' event so connected = true
  if (eventHandlers['connect']) eventHandlers['connect']();
});

beforeEach(() => {
  jest.clearAllMocks();
  // Re-register handlers so the mock stays chainable after clearAllMocks
  mockClient.on.mockImplementation((event, cb) => {
    eventHandlers[event] = cb;
    return mockClient;
  });
  mockClient.pipeline.mockReturnValue(pipelineMock);
});

describe('markOnline / isOnline / markOffline', () => {
  it('markOnline calls sadd on online_users set', async () => {
    await redis.markOnline('user-1');
    expect(mockClient.sadd).toHaveBeenCalledWith(
      'groupsapp:online_users', 'user-1'
    );
  });

  it('markOffline calls srem on online_users set', async () => {
    await redis.markOffline('user-1', '2024-01-01T00:00:00Z');
    expect(mockClient.srem).toHaveBeenCalledWith(
      'groupsapp:online_users', 'user-1'
    );
  });

  it('markOffline stores last_seen when provided', async () => {
    await redis.markOffline('user-1', '2024-01-01T00:00:00Z');
    expect(mockClient.set).toHaveBeenCalledWith(
      'groupsapp:last_seen:user-1',
      '2024-01-01T00:00:00Z',
      'EX',
      7 * 24 * 3600
    );
  });

  it('isOnline returns true when sismember returns 1', async () => {
    mockClient.sismember.mockResolvedValueOnce(1);
    expect(await redis.isOnline('user-1')).toBe(true);
  });

  it('isOnline returns false when sismember returns 0', async () => {
    mockClient.sismember.mockResolvedValueOnce(0);
    expect(await redis.isOnline('user-1')).toBe(false);
  });
});

describe('getOnlineUsers', () => {
  it('returns array from smembers', async () => {
    mockClient.smembers.mockResolvedValueOnce(['user-1', 'user-2']);
    expect(await redis.getOnlineUsers()).toEqual(['user-1', 'user-2']);
  });

  it('returns empty array on Redis error', async () => {
    mockClient.smembers.mockRejectedValueOnce(new Error('err'));
    expect(await redis.getOnlineUsers()).toEqual([]);
  });
});

describe('cacheMessages / getCachedMessages / invalidateCache', () => {
  it('cacheMessages uses pipeline to store messages', async () => {
    const messages = [{ id: 'm-1', content: 'hello' }, { id: 'm-2', content: 'world' }];
    await redis.cacheMessages('group:grp-1', messages);
    expect(mockClient.pipeline).toHaveBeenCalled();
    expect(pipelineMock.del).toHaveBeenCalled();
    expect(pipelineMock.rpush).toHaveBeenCalledTimes(messages.length);
    expect(pipelineMock.expire).toHaveBeenCalled();
    expect(pipelineMock.exec).toHaveBeenCalled();
  });

  it('getCachedMessages returns null on empty list', async () => {
    mockClient.lrange.mockResolvedValueOnce([]);
    expect(await redis.getCachedMessages('group:grp-1')).toBeNull();
  });

  it('getCachedMessages parses and returns cached messages', async () => {
    const messages = [{ id: 'm-1' }, { id: 'm-2' }];
    mockClient.lrange.mockResolvedValueOnce(messages.map(m => JSON.stringify(m)));
    expect(await redis.getCachedMessages('group:grp-1')).toEqual(messages);
  });

  it('invalidateCache calls del with correct key', async () => {
    await redis.invalidateCache('group:grp-1');
    expect(mockClient.del).toHaveBeenCalledWith('groupsapp:messages:group:grp-1');
  });
});

describe('getLastSeen', () => {
  it('returns null on cache miss', async () => {
    mockClient.get.mockResolvedValueOnce(null);
    expect(await redis.getLastSeen('user-1')).toBeNull();
  });

  it('returns cached timestamp', async () => {
    mockClient.get.mockResolvedValueOnce('2024-01-01T00:00:00Z');
    expect(await redis.getLastSeen('user-1')).toBe('2024-01-01T00:00:00Z');
  });
});
