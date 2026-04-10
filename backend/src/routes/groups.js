const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const { groupsClient, call } = require('../grpc/clients');

const router = express.Router();

// POST /api/groups
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await call(groupsClient, 'CreateGroup', {
      name:        name || '',
      description: description || '',
      user_id:     req.user.id,
    });
    if (!result.success) {
      const status = result.error.includes('requerido') ? 400 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.status(201).json({ success: true, data: result.group });
  } catch (err) {
    logger.error('Create group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/groups
router.get('/', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'GetGroups', { user_id: req.user.id });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.groups });
  } catch (err) {
    logger.error('List groups error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/groups/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'GetGroup', {
      group_id: req.params.id,
      user_id:  req.user.id,
    });
    if (!result.success) {
      const status = result.error.includes('no encontrado') ? 404 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.group });
  } catch (err) {
    logger.error('Get group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// PUT /api/groups/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await call(groupsClient, 'UpdateGroup', {
      group_id:    req.params.id,
      user_id:     req.user.id,
      name:        name || '',
      description: description || '',
    });
    if (!result.success) {
      const status = result.error.includes('admin') ? 403 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('Update group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'DeleteGroup', {
      group_id: req.params.id,
      user_id:  req.user.id,
    });
    if (!result.success) {
      const status = result.error.includes('admin') ? 403 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('Delete group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/groups/:id/members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'GetMembers', { group_id: req.params.id });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.members });
  } catch (err) {
    logger.error('List members error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/groups/:id/members
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { user_id, username } = req.body;
    const result = await call(groupsClient, 'AddMember', {
      group_id:        req.params.id,
      user_id:         req.user.id,
      target_user_id:  user_id   || '',
      target_username: username  || '',
    });
    if (!result.success) {
      const status = result.error.includes('admin') ? 403
                   : result.error.includes('no encontrado') ? 404
                   : result.error.includes('requerido') ? 400 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.status(201).json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('Add member error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:id/members/:userId
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'RemoveMember', {
      group_id:       req.params.id,
      user_id:        req.user.id,
      target_user_id: req.params.userId,
    });
    if (!result.success) {
      const status = result.error.includes('admin') ? 403 : 500;
      return res.status(status).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('Remove member error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
