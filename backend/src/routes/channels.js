const express = require('express');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const { groupsClient, call } = require('../grpc/clients');

const router = express.Router();

function grpcStatus(err) {
  const e = (err || '').toLowerCase();
  if (e.includes('no encontrado') || e.includes('not found')) return 404;
  if (e.includes('admin') || e.includes('solo admin')) return 403;
  if (e.includes('requerido') || e.includes('required')) return 400;
  return 500;
}

// GET /api/groups/:groupId/channels
router.get('/:groupId/channels', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'getChannels', { group_id: req.params.groupId });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.channels });
  } catch (err) {
    logger.error('getChannels gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// POST /api/groups/:groupId/channels
router.post('/:groupId/channels', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await call(groupsClient, 'createChannel', {
      group_id: req.params.groupId,
      name: name || '',
      description: description || '',
      user_id: req.user.id,
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.status(201).json({ success: true, data: result.channel });
  } catch (err) {
    logger.error('createChannel gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// DELETE /api/groups/:groupId/channels/:channelId
router.delete('/:groupId/channels/:channelId', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'deleteChannel', {
      group_id: req.params.groupId,
      channel_id: req.params.channelId,
      user_id: req.user.id,
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('deleteChannel gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

module.exports = router;
