const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const { groupsClient, call } = require('../grpc/clients');

const router = express.Router();

// GET /api/groups/:groupId/channels
router.get('/:groupId/channels', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'GetChannels', { group_id: req.params.groupId });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.channels });
  } catch (err) {
    logger.error('List channels error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/groups/:groupId/channels
router.post('/:groupId/channels', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await call(groupsClient, 'CreateChannel', {
      group_id:    req.params.groupId,
      name:        name        || '',
      description: description || '',
      user_id:     req.user.id,
    });
    if (!result.success) {
      const status = result.error.includes('requerido') ? 400 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.status(201).json({ success: true, data: result.channel });
  } catch (err) {
    logger.error('Create channel error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:groupId/channels/:channelId
router.delete('/:groupId/channels/:channelId', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'DeleteChannel', {
      group_id:   req.params.groupId,
      channel_id: req.params.channelId,
      user_id:    req.user.id,
    });
    if (!result.success) {
      const status = result.error.includes('admin') ? 403 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('Delete channel error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
