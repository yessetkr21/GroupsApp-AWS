const Redis = require('ioredis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Keys
const KEYS = {
  ONLINE_USERS:   'groupsapp:online_users',          // SET  — user IDs actualmente online
  LAST_SEEN:      (userId) => `groupsapp:last_seen:${userId}`, // STRING — ISO timestamp
  MSG_CACHE:      (chatKey) => `groupsapp:messages:${chatKey}`, // LIST  — últimos mensajes
};

const MSG_CACHE_TTL  = 300;   // 5 min
const LAST_SEEN_TTL  = 60 * 60 * 24 * 7; // 7 días

let redis = null;
let connected = false;

function createClient() {
  const client = new Redis(REDIS_URL, {
    lazyConnect:        true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) return null; // dejar de reintentar
      return Math.min(times * 500, 3000);
    },
    enableOfflineQueue: false,
  });

  client.on('connect', () => {
    connected = true;
    logger.info('Redis connected', { url: REDIS_URL.replace(/:\/\/.*@/, '://***@') });
  });

  client.on('error', (err) => {
    connected = false;
    logger.warn('Redis error — running without cache', { error: err.message });
  });

  client.on('close', () => {
    connected = false;
    logger.warn('Redis connection closed');
  });

  return client;
}

async function connect() {
  redis = createClient();
  try {
    await redis.connect();
  } catch (err) {
    logger.warn('Redis unavailable — presence and cache will use fallbacks', { error: err.message });
  }
}

function isConnected() { return connected && redis !== null; }

// ── Presence ──────────────────────────────────────────────────────────────────

async function markOnline(userId) {
  if (!isConnected()) return;
  try {
    await redis.sadd(KEYS.ONLINE_USERS, userId);
  } catch (err) {
    logger.warn('Redis markOnline error', { error: err.message });
  }
}

async function markOffline(userId, lastSeenISO) {
  if (!isConnected()) return;
  try {
    await redis.srem(KEYS.ONLINE_USERS, userId);
    if (lastSeenISO) {
      await redis.set(KEYS.LAST_SEEN(userId), lastSeenISO, 'EX', LAST_SEEN_TTL);
    }
  } catch (err) {
    logger.warn('Redis markOffline error', { error: err.message });
  }
}

async function isOnline(userId) {
  if (!isConnected()) return false;
  try {
    return (await redis.sismember(KEYS.ONLINE_USERS, userId)) === 1;
  } catch {
    return false;
  }
}

async function getOnlineUsers() {
  if (!isConnected()) return [];
  try {
    return await redis.smembers(KEYS.ONLINE_USERS);
  } catch {
    return [];
  }
}

async function getLastSeen(userId) {
  if (!isConnected()) return null;
  try {
    return await redis.get(KEYS.LAST_SEEN(userId));
  } catch {
    return null;
  }
}

// ── Message cache ─────────────────────────────────────────────────────────────

async function cacheMessages(chatKey, messages) {
  if (!isConnected() || !messages.length) return;
  try {
    const key = KEYS.MSG_CACHE(chatKey);
    const pipe = redis.pipeline();
    pipe.del(key);
    messages.forEach((m) => pipe.rpush(key, JSON.stringify(m)));
    pipe.expire(key, MSG_CACHE_TTL);
    await pipe.exec();
  } catch (err) {
    logger.warn('Redis cacheMessages error', { error: err.message });
  }
}

async function getCachedMessages(chatKey) {
  if (!isConnected()) return null;
  try {
    const key = KEYS.MSG_CACHE(chatKey);
    const items = await redis.lrange(key, 0, -1);
    if (!items.length) return null;
    return items.map((i) => JSON.parse(i));
  } catch {
    return null;
  }
}

async function invalidateCache(chatKey) {
  if (!isConnected()) return;
  try {
    await redis.del(KEYS.MSG_CACHE(chatKey));
  } catch {}
}

module.exports = {
  connect,
  isConnected,
  markOnline,
  markOffline,
  isOnline,
  getOnlineUsers,
  getLastSeen,
  cacheMessages,
  getCachedMessages,
  invalidateCache,
  KEYS,
};
