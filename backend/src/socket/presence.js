const pool = require('../config/db');

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map();

function setupPresenceHandlers(io, socket) {
  const userId = socket.user.id;

  // Mark user online
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  pool.query('UPDATE users SET is_online = TRUE WHERE id = ?', [userId]).catch(console.error);

  // Broadcast online status
  io.emit('user_online', { user_id: userId, username: socket.user.username });

  // Handle disconnect
  socket.on('disconnect', async () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        try {
          await pool.query('UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = ?', [userId]);
        } catch (err) {
          console.error('Update presence error:', err);
        }
        io.emit('user_offline', { user_id: userId, username: socket.user.username, last_seen: new Date().toISOString() });
      }
    }
  });

  // Get online users list
  socket.on('get_online_users', () => {
    const online = Array.from(onlineUsers.keys());
    socket.emit('online_users', online);
  });
}

module.exports = { setupPresenceHandlers };
