const express = require('express');
const auth = require('../middleware/auth');
const logger = require('../config/logger');
const { groupsClient, call } = require('../grpc/clients');
const { getIO } = require('../socket');

const router = express.Router();

function grpcStatus(err) {
  const e = (err || '').toLowerCase();
  if (e.includes('no encontrado') || e.includes('not found')) return 404;
  if (e.includes('requerido') || e.includes('required')) return 400;
  if (e.includes('ti mismo')) return 400;
  return 500;
}

// GET /api/contacts/search?q=...
router.get('/search', auth, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Query requerida' });
    const result = await call(groupsClient, 'searchUsers', { query: q, user_id: req.user.id });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.users });
  } catch (err) {
    logger.error('searchUsers gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// GET /api/contacts
router.get('/', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'getContacts', { user_id: req.user.id });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.contacts });
  } catch (err) {
    logger.error('getContacts gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// POST /api/contacts
router.post('/', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username requerido' });

    const result = await call(groupsClient, 'addContact', {
      user_id: req.user.id, target_username: username,
    });
    if (!result.success) return res.status(grpcStatus(result.error)).json({ success: false, error: result.error });

    // Socket.IO: notificar al contacto agregado
    if (result.added_user_id && result.adder_info_json) {
      try {
        const adder = JSON.parse(result.adder_info_json);
        const io = getIO();
        if (io) io.to(`user:${result.added_user_id}`).emit('contact_added', adder);
      } catch (_) {}
    }

    res.status(201).json({ success: true, data: result.contact });
  } catch (err) {
    logger.error('addContact gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

// DELETE /api/contacts/:userId
router.delete('/:userId', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'deleteContact', {
      user_id: req.user.id, target_user_id: req.params.userId,
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    const io = getIO();
    if (io) io.to(`user:${req.params.userId}`).emit('contact_removed', { user_id: req.user.id });

    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('deleteContact gRPC error:', { error: err.message });
    res.status(503).json({ success: false, error: 'Servicio no disponible' });
  }
});

module.exports = router;
