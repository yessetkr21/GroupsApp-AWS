const express = require('express');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const { groupsClient, call } = require('../grpc/clients');

const router = express.Router();

function grpcStatus(err) {
  const e = (err || '').toLowerCase();
  if (e.includes('no encontrado') || e.includes('not found')) return 404;
  if (e.includes('admin') || e.includes('solo admin') || e.includes('permiso')) return 403;
  if (e.includes('requerido') || e.includes('required')) return 400;
  if (e.includes('ya existe') || e.includes('already')) return 409;
  return 500;
}

// POST /api/groups
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await call(groupsClient, 'createGroup', {
      name, description: description || '', user_id: req.user.id,
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.status(201).json({ success: true, data: result.group });
  } catch (err) {
    logger.error('createGroup gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// GET /api/groups
router.get('/', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'getGroups', { user_id: req.user.id });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.groups });
  } catch (err) {
    logger.error('getGroups gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// GET /api/groups/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'getGroup', {
      group_id: req.params.id, user_id: req.user.id,
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.json({ success: true, data: result.group });
  } catch (err) {
    logger.error('getGroup gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// PUT /api/groups/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await call(groupsClient, 'updateGroup', {
      group_id: req.params.id, user_id: req.user.id,
      name: name || '', description: description || '',
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('updateGroup gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'deleteGroup', {
      group_id: req.params.id, user_id: req.user.id,
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('deleteGroup gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// GET /api/groups/:id/members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'getMembers', { group_id: req.params.id });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.members });
  } catch (err) {
    logger.error('getMembers gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// POST /api/groups/:id/members
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { user_id, username } = req.body;
    const result = await call(groupsClient, 'addMember', {
      group_id: req.params.id,
      user_id: req.user.id,
      target_user_id: user_id || '',
      target_username: username || '',
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.status(201).json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('addMember gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// DELETE /api/groups/:id/members/:userId
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'removeMember', {
      group_id: req.params.id,
      user_id: req.user.id,
      target_user_id: req.params.userId,
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('removeMember gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

module.exports = router;
