const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const { messagesClient, call } = require('../grpc/clients');
const redis = require('../config/redis');

const router = express.Router();

// GET /api/messages/group/:groupId
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const cacheKey = `group:${req.params.groupId}`;

    // Try Redis cache first (only for first page, no pagination)
    if (!req.query.before) {
      const cached = await redis.getCachedMessages(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, cached: true });
      }
    }

    const result = await call(messagesClient, 'GetGroupMessages', {
      group_id: req.params.groupId,
      limit:    parseInt(req.query.limit) || 50,
      before:   req.query.before || '',
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    // Store in cache
    if (!req.query.before) {
      await redis.cacheMessages(cacheKey, result.messages);
    }

    res.json({ success: true, data: result.messages });
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
      if (cached) {
        return res.json({ success: true, data: cached, cached: true });
      }
    }

    const result = await call(messagesClient, 'GetChannelMessages', {
      channel_id: req.params.channelId,
      limit:      parseInt(req.query.limit) || 50,
      before:     req.query.before || '',
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    if (!req.query.before) {
      await redis.cacheMessages(cacheKey, result.messages);
    }

    res.json({ success: true, data: result.messages });
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
      if (cached) {
        return res.json({ success: true, data: cached, cached: true });
      }
    }

    const result = await call(messagesClient, 'GetDirectMessages', {
      user_id:       req.user.id,
      other_user_id: req.params.userId,
      limit:         parseInt(req.query.limit) || 50,
      before:        req.query.before || '',
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    if (!req.query.before) {
      await redis.cacheMessages(cacheKey, result.messages);
    }

    res.json({ success: true, data: result.messages });
  } catch (err) {
    logger.error('Get DM messages error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
