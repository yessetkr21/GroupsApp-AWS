const pool = require('../config/db');
const rabbitmq = require('../config/rabbitmq');
const logger = require('../config/logger');
const { wsConnectionsGauge } = require('../config/metrics');
const redisClient = require('../config/redis');

// ── In-memory fallback: userId -> Set<socketId> ───────────────────────────────
// Siempre se mantiene local para saber cuántas conexiones tiene cada user.
// Redis almacena el SET global de usuarios online (compartido entre instancias).
const socketMap = new Map();

function isUserOnline(userId) {
  return socketMap.has(userId) && socketMap.get(userId).size > 0;
}

function getUserSockets(userId) {
  return socketMap.get(userId) || new Set();
}

function setupPresenceHandlers(io, socket) {
  const userId   = socket.user.id;
  const username = socket.user.username;

  // Track socket locally
  if (!socketMap.has(userId)) socketMap.set(userId, new Set());
  socketMap.get(userId).add(socket.id);

  // Each user joins their personal room for DMs and notifications
  socket.join(`user:${userId}`);

  const isFirstConnection = socketMap.get(userId).size === 1;

  if (isFirstConnection) {
    // Mark online in DB + Redis
    pool.query('UPDATE users SET is_online = TRUE WHERE id = ?', [userId])
      .catch((e) => logger.error('Update online status error', { error: e.message }));

    redisClient.markOnline(userId);

    // Broadcast
    io.emit('user_online', { user_id: userId, username });

    rabbitmq.publishUserOnline({ user_id: userId, username });
    logger.info('User online', { user_id: userId, username });
  }

  // Update WS gauge
  wsConnectionsGauge.inc();

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    wsConnectionsGauge.dec();

    const sockets = socketMap.get(userId);
    if (sockets) {
      sockets.delete(socket.id);

      if (sockets.size === 0) {
        socketMap.delete(userId);
        const now = new Date();

        try {
          await pool.query(
            'UPDATE users SET is_online = FALSE, last_seen = ? WHERE id = ?',
            [now, userId]
          );
        } catch (err) {
          logger.error('Update presence error', { error: err.message });
        }

        // Mark offline in Redis (also stores last_seen)
        await redisClient.markOffline(userId, now.toISOString());

        const offlinePayload = {
          user_id:  userId,
          username,
          last_seen: now.toISOString(),
        };
        io.emit('user_offline', offlinePayload);

        rabbitmq.publishUserOffline(offlinePayload);
        logger.info('User offline', { user_id: userId, username });
      }
    }
  });

  // ── Get online users + last_seen ────────────────────────────────────────────
  socket.on('get_online_users', async () => {
    // Prefer Redis (shared across instances), fallback to in-memory Map
    let online;
    if (redisClient.isConnected()) {
      online = await redisClient.getOnlineUsers();
    } else {
      online = Array.from(socketMap.keys());
    }
    socket.emit('online_users', online);

    // last_seen for offline contacts — try Redis first, then DB
    try {
      const [contacts] = await pool.query(
        `SELECT u.id, u.last_seen FROM contacts c
         JOIN users u ON c.contact_user_id = u.id
         WHERE c.user_id = ? AND u.is_online = FALSE AND u.last_seen IS NOT NULL`,
        [userId]
      );

      const lastSeenMap = {};
      for (const c of contacts) {
        // Try Redis cache first
        const cached = await redisClient.getLastSeen(c.id);
        lastSeenMap[c.id] = cached || (c.last_seen ? new Date(c.last_seen).toISOString() : null);
      }

      const filtered = Object.fromEntries(
        Object.entries(lastSeenMap).filter(([, v]) => v)
      );
      if (Object.keys(filtered).length > 0) {
        socket.emit('users_last_seen', filtered);
      }
    } catch (err) {
      logger.error('Get last_seen error', { error: err.message });
    }
  });
}

module.exports = { setupPresenceHandlers, socketMap, isUserOnline, getUserSockets };
