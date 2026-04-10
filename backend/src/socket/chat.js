const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { isUserOnline } = require('./presence');
const rabbitmq = require('../config/rabbitmq');
const logger = require('../config/logger');
const { messagesSentTotal } = require('../config/metrics');
const redis = require('../config/redis');

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
      let { group_id, channel_id, receiver_id, content, message_type, file_url, file_name } = data;
      const msgId = uuidv4();
      let status = 'sent';

      if (group_id || channel_id) {
        // Bug fix: when only channel_id is sent (no group_id), look up group_id from DB
        if (channel_id && !group_id) {
          const [chRows] = await pool.query('SELECT group_id FROM channels WHERE id = ?', [channel_id]);
          if (chRows.length > 0) group_id = chRows[0].group_id;
        }

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
        // DM: if receiver is online, mark as delivered
        if (isUserOnline(receiver_id)) {
          status = 'delivered';
        }

        await pool.query(
          `INSERT INTO messages (id, sender_id, receiver_id, content, file_url, file_name, file_type, message_type, status, \`read\`)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            msgId,
            socket.user.id,
            receiver_id,
            content || '',
            file_url || null,
            file_name || null,
            message_type === 'image' ? 'image' : (message_type === 'file' ? 'file' : null),
            message_type || 'text',
            status,
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
        status,
        created_at: new Date().toISOString(),
      };

      if (channel_id) {
        // Emit to channel room - everyone in the channel gets it
        io.to(`channel:${channel_id}`).emit('new_message', message);
      } else if (group_id) {
        // Emit to group room - everyone in the group gets it
        io.to(`group:${group_id}`).emit('new_message', message);
      } else if (receiver_id) {
        // DM: emit to receiver's personal room AND sender's personal room
        io.to(`user:${receiver_id}`).emit('new_message', message);
        io.to(`user:${socket.user.id}`).emit('new_message', message);

        // If already 'delivered', notify sender so UI updates the tick immediately
        if (status === 'delivered') {
          io.to(`user:${socket.user.id}`).emit('messages_delivered', { message_ids: [msgId] });
        }
      }

      // Invalidate Redis message cache so next fetch gets fresh data
      if (channel_id) {
        redis.invalidateCache(`channel:${channel_id}`);
      } else if (group_id) {
        redis.invalidateCache(`group:${group_id}`);
      } else if (receiver_id) {
        const dmKey = [socket.user.id, receiver_id].sort().join(':');
        redis.invalidateCache(`dm:${dmKey}`);
      }

      // Publish to RabbitMQ (async, non-blocking)
      rabbitmq.publishMessageSent(message);

      // Update Prometheus counter
      messagesSentTotal.inc({ type: message_type || 'text' });

      logger.info('Message sent', {
        id: msgId,
        sender: socket.user.username,
        type: message_type || 'text',
        group_id: group_id || null,
        channel_id: channel_id || null,
        receiver_id: receiver_id || null,
      });
    } catch (err) {
      logger.error('Send message error', { error: err.message });
      socket.emit('message_error', { error: 'Error al enviar mensaje', tempId: data.tempId });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { group_id, channel_id, receiver_id } = data;
    const typingData = { user_id: socket.user.id, username: socket.user.username };

    if (channel_id) {
      socket.to(`channel:${channel_id}`).emit('user_typing', typingData);
    } else if (group_id) {
      socket.to(`group:${group_id}`).emit('user_typing', typingData);
    } else if (receiver_id) {
      io.to(`user:${receiver_id}`).emit('user_typing', typingData);
    }
  });

  socket.on('stop_typing', (data) => {
    const { group_id, channel_id, receiver_id } = data;
    const typingData = { user_id: socket.user.id, username: socket.user.username };

    if (channel_id) {
      socket.to(`channel:${channel_id}`).emit('user_stop_typing', typingData);
    } else if (group_id) {
      socket.to(`group:${group_id}`).emit('user_stop_typing', typingData);
    } else if (receiver_id) {
      io.to(`user:${receiver_id}`).emit('user_stop_typing', typingData);
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

      const placeholders = message_ids.map(() => '?').join(',');

      // Update DM messages
      await pool.query(
        `UPDATE messages SET \`read\` = 1, status = 'read' WHERE id IN (${placeholders}) AND receiver_id = ?`,
        [...message_ids, socket.user.id]
      ).catch(() => {});

      // Update group_messages
      await pool.query(
        `UPDATE group_messages SET status = 'read' WHERE id IN (${placeholders})`,
        message_ids
      ).catch(() => {});

      // Find senders and notify them
      const [dmMsgs] = await pool.query(
        `SELECT DISTINCT sender_id FROM messages WHERE id IN (${placeholders})`,
        message_ids
      ).catch(() => [[]]);
      const [grpMsgs] = await pool.query(
        `SELECT DISTINCT sender_id FROM group_messages WHERE id IN (${placeholders})`,
        message_ids
      ).catch(() => [[]]);

      const senderIds = new Set([
        ...(dmMsgs || []).map((m) => m.sender_id),
        ...(grpMsgs || []).map((m) => m.sender_id),
      ]);

      const readPayload = {
        reader_id: socket.user.id,
        reader_username: socket.user.username,
        message_ids,
      };

      senderIds.forEach((senderId) => {
        io.to(`user:${senderId}`).emit('messages_read', readPayload);
      });

      // Publish read event to RabbitMQ
      rabbitmq.publishMessageRead(readPayload);
    } catch (err) {
      logger.error('Mark read error', { error: err.message });
    }
  });
}

module.exports = { setupChatHandlers };
