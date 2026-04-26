const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../config/db');
const redis = require('../config/redis');

const router = express.Router();

// GET /api/messages/group/:groupId
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const cacheKey = `group:${req.params.groupId}`;
    if (!req.query.before) {
      const cached = await redis.getCachedMessages(cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const params = [req.params.groupId];
    let beforeClause = '';
    if (req.query.before) { beforeClause = 'AND m.created_at < ?'; params.push(req.query.before); }

    const [messages] = await pool.execute(
      `SELECT m.id, m.sender_id, m.group_id, m.channel_id, NULL AS receiver_id,
              m.content, m.message_type, m.file_url, m.file_name, m.status, m.created_at,
              u.username AS sender_username, u.profile_picture AS sender_avatar
       FROM group_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.group_id = ? AND m.channel_id IS NULL ${beforeClause}
       ORDER BY m.created_at DESC LIMIT ${limit}`,
      params
    );
    const sorted = messages.reverse();
    if (!req.query.before) await redis.cacheMessages(cacheKey, sorted);
    res.json({ success: true, data: sorted });
  } catch (err) {
    logger.error('Get group messages error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/messages/channel/:channelId
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const cacheKey = `channel:${req.params.channelId}`;
    if (!req.query.before) {
      const cached = await redis.getCachedMessages(cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const params = [req.params.channelId];
    let beforeClause = '';
    if (req.query.before) { beforeClause = 'AND m.created_at < ?'; params.push(req.query.before); }

    const [messages] = await pool.execute(
      `SELECT m.id, m.sender_id, m.group_id, m.channel_id, NULL AS receiver_id,
              m.content, m.message_type, m.file_url, m.file_name, m.status, m.created_at,
              u.username AS sender_username, u.profile_picture AS sender_avatar
       FROM group_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.channel_id = ? ${beforeClause}
       ORDER BY m.created_at DESC LIMIT ${limit}`,
      params
    );
    const sorted = messages.reverse();
    if (!req.query.before) await redis.cacheMessages(cacheKey, sorted);
    res.json({ success: true, data: sorted });
  } catch (err) {
    logger.error('Get channel messages error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/messages/dm/:userId
router.get('/dm/:userId', auth, async (req, res) => {
  try {
    const cacheKey = `dm:${[req.user.id, req.params.userId].sort().join(':')}`;
    if (!req.query.before) {
      const cached = await redis.getCachedMessages(cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const params = [req.user.id, req.params.userId, req.params.userId, req.user.id];
    let beforeClause = '';
    if (req.query.before) { beforeClause = 'AND m.created_at < ?'; params.push(req.query.before); }

    const [messages] = await pool.execute(
      `SELECT m.id, m.sender_id, NULL AS group_id, NULL AS channel_id, m.receiver_id,
              m.content, m.message_type, m.file_url, m.file_name, m.status, m.created_at,
              u.username AS sender_username, u.profile_picture AS sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ${beforeClause}
       ORDER BY m.created_at DESC LIMIT ${limit}`,
      params
    );
    const sorted = messages.reverse();
    if (!req.query.before) await redis.cacheMessages(cacheKey, sorted);
    res.json({ success: true, data: sorted });
  } catch (err) {
    logger.error('Get DM messages error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const [[gm]] = await pool.execute(
      'SELECT id, sender_id, group_id, channel_id FROM group_messages WHERE id = ?',
      [req.params.messageId]
    );
    if (gm) {
      if (gm.sender_id !== req.user.id) return res.status(403).json({ success: false, error: 'Solo puedes eliminar tus mensajes' });
      await pool.execute('DELETE FROM group_messages WHERE id = ?', [req.params.messageId]);
      if (gm.channel_id) await redis.invalidateCache(`channel:${gm.channel_id}`);
      else await redis.invalidateCache(`group:${gm.group_id}`);
      return res.json({ success: true, data: { message: 'Mensaje eliminado' } });
    }

    const [[dm]] = await pool.execute(
      'SELECT id, sender_id, receiver_id FROM messages WHERE id = ?',
      [req.params.messageId]
    );
    if (dm) {
      if (dm.sender_id !== req.user.id) return res.status(403).json({ success: false, error: 'Solo puedes eliminar tus mensajes' });
      await pool.execute('DELETE FROM messages WHERE id = ?', [req.params.messageId]);
      await redis.invalidateCache(`dm:${[dm.sender_id, dm.receiver_id].sort().join(':')}`);
      return res.json({ success: true, data: { message: 'Mensaje eliminado' } });
    }

    res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
  } catch (err) {
    logger.error('Delete message error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
