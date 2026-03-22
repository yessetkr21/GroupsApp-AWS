const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

function setupChatHandlers(io, socket) {
  // Join a group room
  socket.on('join_group', (groupId) => {
    socket.join(`group:${groupId}`);
  });

  // Join a channel room
  socket.on('join_channel', (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('leave_group', (groupId) => {
    socket.leave(`group:${groupId}`);
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(`channel:${channelId}`);
  });

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { group_id, channel_id, receiver_id, content, message_type, file_url, file_name } = data;
      const msgId = uuidv4();

      if (group_id || channel_id) {
        // Group/channel message -> group_messages table
        await pool.query(
          `INSERT INTO group_messages (id, group_id, sender_id, content, file_url, file_name, file_type, message_type, channel_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
          [
            msgId,
            group_id || null,
            socket.user.id,
            content || '',
            file_url || null,
            file_name || null,
            message_type === 'image' ? 'image' : (message_type === 'file' ? 'file' : null),
            message_type || 'text',
            channel_id || null,
          ]
        );
      } else if (receiver_id) {
        // DM -> messages table
        await pool.query(
          `INSERT INTO messages (id, sender_id, receiver_id, content, file_url, file_name, file_type, message_type, status, \`read\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', 0)`,
          [
            msgId,
            socket.user.id,
            receiver_id,
            content || '',
            file_url || null,
            file_name || null,
            message_type === 'image' ? 'image' : (message_type === 'file' ? 'file' : null),
            message_type || 'text',
          ]
        );
      }

      const message = {
        id: msgId,
        sender_id: socket.user.id,
        sender_username: socket.user.username,
        group_id: group_id || null,
        channel_id: channel_id || null,
        receiver_id: receiver_id || null,
        content,
        message_type: message_type || 'text',
        file_url: file_url || null,
        file_name: file_name || null,
        status: 'sent',
        created_at: new Date().toISOString(),
      };

      if (channel_id) {
        io.to(`channel:${channel_id}`).emit('new_message', message);
      } else if (group_id) {
        io.to(`group:${group_id}`).emit('new_message', message);
      } else if (receiver_id) {
        // DM: send to both sender and receiver
        const allSockets = await io.fetchSockets();
        const targetSockets = allSockets.filter(
          (s) => s.user.id === receiver_id || s.user.id === socket.user.id
        );
        targetSockets.forEach((s) => s.emit('new_message', message));
      }

      socket.emit('message_sent', { tempId: data.tempId, message });
    } catch (err) {
      console.error('Send message error:', err);
      socket.emit('message_error', { error: 'Error al enviar mensaje', tempId: data.tempId });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { group_id, channel_id } = data;
    const typingData = { user_id: socket.user.id, username: socket.user.username };

    if (channel_id) {
      socket.to(`channel:${channel_id}`).emit('user_typing', typingData);
    } else if (group_id) {
      socket.to(`group:${group_id}`).emit('user_typing', typingData);
    }
  });

  socket.on('stop_typing', (data) => {
    const { group_id, channel_id } = data;
    const typingData = { user_id: socket.user.id, username: socket.user.username };

    if (channel_id) {
      socket.to(`channel:${channel_id}`).emit('user_stop_typing', typingData);
    } else if (group_id) {
      socket.to(`group:${group_id}`).emit('user_stop_typing', typingData);
    }
  });

  // Mark messages as read
  socket.on('mark_read', async (data) => {
    try {
      const { message_ids } = data;
      if (!message_ids || message_ids.length === 0) return;

      // Insert into message_reads
      for (const msgId of message_ids) {
        const readId = uuidv4();
        await pool.query(
          'INSERT IGNORE INTO message_reads (id, message_id, user_id) VALUES (?, ?, ?)',
          [readId, msgId, socket.user.id]
        ).catch(() => {});
      }

      // Update DM messages read status
      const placeholders = message_ids.map(() => '?').join(',');
      await pool.query(
        `UPDATE messages SET \`read\` = 1, status = 'read' WHERE id IN (${placeholders}) AND receiver_id = ?`,
        [...message_ids, socket.user.id]
      ).catch(() => {});

      // Update group_messages status
      await pool.query(
        `UPDATE group_messages SET status = 'read' WHERE id IN (${placeholders})`,
        message_ids
      ).catch(() => {});

      // Notify senders
      const [dmMsgs] = await pool.query(
        `SELECT DISTINCT sender_id FROM messages WHERE id IN (${placeholders})`,
        message_ids
      ).catch(() => [[]]);
      const [grpMsgs] = await pool.query(
        `SELECT DISTINCT sender_id FROM group_messages WHERE id IN (${placeholders})`,
        message_ids
      ).catch(() => [[]]);

      const senderIds = new Set([...dmMsgs.map((m) => m.sender_id), ...grpMsgs.map((m) => m.sender_id)]);
      const allSockets = await io.fetchSockets();
      senderIds.forEach((senderId) => {
        const senderSockets = allSockets.filter((s) => s.user.id === senderId);
        senderSockets.forEach((s) =>
          s.emit('messages_read', { reader_id: socket.user.id, reader_username: socket.user.username, message_ids })
        );
      });
    } catch (err) {
      console.error('Mark read error:', err);
    }
  });
}

module.exports = { setupChatHandlers };
