const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../socket');

const router = express.Router();

// GET /api/contacts/search?q=...
router.get('/search', auth, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Query requerida' });

    const [users] = await pool.execute(
      `SELECT id, username, name, email, profile_picture, is_online
       FROM users
       WHERE (username LIKE ? OR email LIKE ? OR name LIKE ?) AND id != ?
       LIMIT 20`,
      [`%${q}%`, `%${q}%`, `%${q}%`, req.user.id]
    );
    res.json({ success: true, data: users });
  } catch (err) {
    logger.error('Search contacts error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/contacts
router.get('/', auth, async (req, res) => {
  try {
    const [contacts] = await pool.execute(
      `SELECT u.id, u.username, u.name, u.email, u.profile_picture, u.is_online, u.last_seen, c.created_at AS added_at
       FROM contacts c
       JOIN users u ON c.contact_user_id = u.id
       WHERE c.user_id = ?
       ORDER BY u.username ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: contacts });
  } catch (err) {
    logger.error('List contacts error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/contacts
router.post('/', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username requerido' });

    const [[target]] = await pool.execute(
      'SELECT id, username, name, email, profile_picture, is_online FROM users WHERE username = ?',
      [username]
    );
    if (!target) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    if (target.id === req.user.id) return res.status(400).json({ success: false, error: 'No puedes agregarte a ti mismo' });

    await pool.execute(
      'INSERT IGNORE INTO contacts (id, user_id, contact_user_id) VALUES (?, ?, ?)',
      [uuidv4(), req.user.id, target.id]
    );

    const io = getIO();
    if (io) {
      const [[adder]] = await pool.execute(
        'SELECT id, username, name, profile_picture, is_online FROM users WHERE id = ?',
        [req.user.id]
      );
      io.to(`user:${target.id}`).emit('contact_added', adder);
    }

    res.status(201).json({ success: true, data: target });
  } catch (err) {
    logger.error('Add contact error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/contacts/:userId
router.delete('/:userId', auth, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM contacts WHERE user_id = ? AND contact_user_id = ?',
      [req.user.id, req.params.userId]
    );

    const io = getIO();
    if (io) {
      io.to(`user:${req.params.userId}`).emit('contact_removed', { user_id: req.user.id });
    }

    res.json({ success: true, data: { message: 'Contacto eliminado' } });
  } catch (err) {
    logger.error('Delete contact error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
