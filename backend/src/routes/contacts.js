const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const { groupsClient, call } = require('../grpc/clients');
const { getIO } = require('../socket');

const router = express.Router();

// GET /api/contacts/search?q=...   (must be before /:userId)
router.get('/search', auth, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Query requerida' });

    const result = await call(groupsClient, 'SearchUsers', {
      query:   q,
      user_id: req.user.id,
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.users });
  } catch (err) {
    logger.error('Search contacts error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/contacts
router.get('/', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'GetContacts', { user_id: req.user.id });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.contacts });
  } catch (err) {
    logger.error('List contacts error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/contacts
router.post('/', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const result = await call(groupsClient, 'AddContact', {
      user_id:         req.user.id,
      target_username: username || '',
    });
    if (!result.success) {
      const status = result.error.includes('no encontrado') ? 404
                   : result.error.includes('requerido') || result.error.includes('ti mismo') ? 400
                   : 500;
      return res.status(status).json({ success: false, error: result.error });
    }

    // Emit Socket.IO notification to the added user (api-gateway owns Socket.IO)
    const io = getIO();
    if (io && result.added_user_id && result.adder_info_json) {
      try {
        const adderInfo = JSON.parse(result.adder_info_json);
        io.to(`user:${result.added_user_id}`).emit('contact_added', adderInfo);
      } catch (_) {}
    }

    res.status(201).json({ success: true, data: result.contact });
  } catch (err) {
    logger.error('Add contact error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/contacts/:userId
router.delete('/:userId', auth, async (req, res) => {
  try {
    const result = await call(groupsClient, 'DeleteContact', {
      user_id:        req.user.id,
      target_user_id: req.params.userId,
    });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    // Notify other user via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`user:${req.params.userId}`).emit('contact_removed', { user_id: req.user.id });
    }

    res.json({ success: true, data: { message: result.message } });
  } catch (err) {
    logger.error('Delete contact error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
