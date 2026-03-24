const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/reactions/:messageId — Get reactions grouped by emoji
router.get('/:messageId', auth, async (req, res) => {
  try {
    const [reactions] = await pool.query(
      `SELECT emoji, COUNT(*) as count,
        JSON_ARRAYAGG(JSON_OBJECT('user_id', user_id)) as users
      FROM message_reactions
      WHERE message_id = ?
      GROUP BY emoji`,
      [req.params.messageId]
    );

    const parsed = reactions.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      users: typeof r.users === 'string' ? JSON.parse(r.users) : r.users,
    }));

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Get reactions error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/reactions — Toggle a reaction (add if not exists, remove if exists)
router.post('/', auth, async (req, res) => {
  try {
    const { message_id, emoji, message_table } = req.body;
    if (!message_id || !emoji || !message_table) {
      return res.status(400).json({ success: false, error: 'message_id, emoji y message_table son requeridos' });
    }

    // Check if reaction already exists
    const [existing] = await pool.query(
      'SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
      [message_id, req.user.id, emoji]
    );

    let action;
    if (existing.length > 0) {
      // Remove reaction
      await pool.query('DELETE FROM message_reactions WHERE id = ?', [existing[0].id]);
      action = 'removed';
    } else {
      // Add reaction
      const id = uuidv4();
      await pool.query(
        'INSERT INTO message_reactions (id, message_id, user_id, emoji, message_table) VALUES (?, ?, ?, ?, ?)',
        [id, message_id, req.user.id, emoji, message_table]
      );
      action = 'added';
    }

    // Return updated reactions for this message
    const [reactions] = await pool.query(
      `SELECT emoji, COUNT(*) as count,
        JSON_ARRAYAGG(JSON_OBJECT('user_id', user_id)) as users
      FROM message_reactions
      WHERE message_id = ?
      GROUP BY emoji`,
      [message_id]
    );

    const parsed = reactions.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      users: typeof r.users === 'string' ? JSON.parse(r.users) : r.users,
    }));

    res.json({ success: true, data: { action, reactions: parsed } });
  } catch (err) {
    console.error('Toggle reaction error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
