const express = require('express');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const pool = require('../config/db');
const redis = require('../config/redis');
const { messagesClient, call } = require('../grpc/clients');

const router = express.Router();

// GET /api/messages/group/:groupId
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await call(messagesClient, 'getGroupMessages', {
      group_id: req.params.groupId,
      limit,
      before: req.query.before || '',
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.messages });
  } catch (err) {
    logger.error('getGroupMessages gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// GET /api/messages/channel/:channelId
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await call(messagesClient, 'getChannelMessages', {
      channel_id: req.params.channelId,
      limit,
      before: req.query.before || '',
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.messages });
  } catch (err) {
    logger.error('getChannelMessages gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// GET /api/messages/dm/:userId
router.get('/dm/:userId', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await call(messagesClient, 'getDirectMessages', {
      user_id: req.user.id,
      other_user_id: req.params.userId,
      limit,
      before: req.query.before || '',
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.messages });
  } catch (err) {
    logger.error('getDirectMessages gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// DELETE /api/messages/:messageId  — directo a DB (no existe en proto)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const [[gm]] = await pool.execute(
      'SELECT id, sender_id, group_id, channel_id FROM group_messages WHERE id = ?',
      [req.params.messageId]
    );
    if (gm) {
      if (gm.sender_id !== req.user.id)
        return res.status(403).json({ success: false, error: 'Solo puedes eliminar tus mensajes' });
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
      if (dm.sender_id !== req.user.id)
        return res.status(403).json({ success: false, error: 'Solo puedes eliminar tus mensajes' });
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
