const pool = require('../config/db');

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map();

function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

function getUserSockets(userId) {
  return onlineUsers.get(userId) || new Set();
}

function setupPresenceHandlers(io, socket) {
  const userId = socket.user.id;

  // Mark user online
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Each user joins their own personal room for receiving DMs and notifications
  socket.join(`user:${userId}`);

  pool.query('UPDATE users SET is_online = TRUE WHERE id = ?', [userId]).catch(console.error);

  // Broadcast online status to everyone
  io.emit('user_online', { user_id: userId, username: socket.user.username });

  // Handle disconnect
  socket.on('disconnect', async () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        const now = new Date();
        try {
          await pool.query('UPDATE users SET is_online = FALSE, last_seen = ? WHERE id = ?', [now, userId]);
        } catch (err) {
          console.error('Update presence error:', err);
        }
        io.emit('user_offline', {
          user_id: userId,
          username: socket.user.username,
          last_seen: now.toISOString(),
        });
      }
    }
  });

  // Get online users list + last_seen for offline contacts
  socket.on('get_online_users', async () => {
    const online = Array.from(onlineUsers.keys());
    socket.emit('online_users', online);

    try {
      const [contacts] = await pool.query(
        `SELECT u.id, u.last_seen FROM contacts c
         JOIN users u ON c.contact_user_id = u.id
         WHERE c.user_id = ? AND u.is_online = FALSE AND u.last_seen IS NOT NULL`,
        [userId]
      );
      const lastSeenMap = {};
      contacts.forEach((c) => {
        if (c.last_seen) lastSeenMap[c.id] = c.last_seen;
      });
      if (Object.keys(lastSeenMap).length > 0) {
        socket.emit('users_last_seen', lastSeenMap);
      }
    } catch (err) {
      console.error('Get last_seen error:', err);
    }
  });
}

module.exports = { setupPresenceHandlers, onlineUsers, isUserOnline, getUserSockets };
