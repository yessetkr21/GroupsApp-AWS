const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { getIO } = require('../socket');

const router = express.Router();

// GET /api/contacts
router.get('/', auth, async (req, res) => {
  try {
    const [contacts] = await pool.query(
      `SELECT u.id, u.name as username, u.email, u.profile_picture as avatar_url, u.is_online, u.last_seen, c.created_at as contact_since
      FROM contacts c
      JOIN users u ON c.contact_user_id = u.id
      WHERE c.user_id = ?
      ORDER BY u.name`,
      [req.user.id]
    );
    res.json({ success: true, data: contacts });
  } catch (err) {
    console.error('List contacts error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/contacts
router.post('/', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username requerido' });
    }

    const [users] = await pool.query(
      'SELECT id, name as username, email, profile_picture as avatar_url, is_online, last_seen FROM users WHERE name = ?',
      [username]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (users[0].id === req.user.id) {
      return res.status(400).json({ success: false, error: 'No puedes agregarte a ti mismo' });
    }

    // Create bidirectional contact relationship
    const id1 = uuidv4();
    const id2 = uuidv4();
    await pool.query(
      'INSERT IGNORE INTO contacts (id, user_id, contact_user_id) VALUES (?, ?, ?)',
      [id1, req.user.id, users[0].id]
    );
    await pool.query(
      'INSERT IGNORE INTO contacts (id, user_id, contact_user_id) VALUES (?, ?, ?)',
      [id2, users[0].id, req.user.id]
    );

    // Notify the other user via socket so their contact list updates in real-time
    const io = getIO();
    if (io) {
      const [adderInfo] = await pool.query(
        'SELECT id, name as username, email, profile_picture as avatar_url, is_online, last_seen FROM users WHERE id = ?',
        [req.user.id]
      );
      if (adderInfo.length > 0) {
        io.to(`user:${users[0].id}`).emit('contact_added', adderInfo[0]);
      }
    }

    res.status(201).json({ success: true, data: users[0] });
  } catch (err) {
    console.error('Add contact error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/contacts/:userId
router.delete('/:userId', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM contacts WHERE (user_id = ? AND contact_user_id = ?) OR (user_id = ? AND contact_user_id = ?)',
      [req.user.id, req.params.userId, req.params.userId, req.user.id]
    );

    // Notify the other user
    const io = getIO();
    if (io) {
      io.to(`user:${req.params.userId}`).emit('contact_removed', { user_id: req.user.id });
    }

    res.json({ success: true, data: { message: 'Contacto eliminado' } });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/contacts/search?q=...
router.get('/search', auth, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query requerida' });
    }

    const [users] = await pool.query(
      'SELECT id, name as username, email, profile_picture as avatar_url FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 20',
      [`%${q}%`, `%${q}%`, req.user.id]
    );
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('Search contacts error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
