const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/groups/:groupId/channels
router.get('/:groupId/channels', auth, async (req, res) => {
  try {
    const [channels] = await pool.query(
      `SELECT c.*,
        (SELECT content FROM group_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM channels c WHERE c.group_id = ? ORDER BY c.created_at`,
      [req.params.groupId]
    );
    res.json({ success: true, data: channels });
  } catch (err) {
    console.error('List channels error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/groups/:groupId/channels
router.post('/:groupId/channels', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nombre del canal requerido' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO channels (id, group_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.groupId, name, description || null, req.user.id]
    );

    res.status(201).json({
      success: true,
      data: { id, group_id: req.params.groupId, name, description },
    });
  } catch (err) {
    console.error('Create channel error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:groupId/channels/:channelId
router.delete('/:groupId/channels/:channelId', auth, async (req, res) => {
  try {
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.groupId, req.user.id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo el admin puede eliminar canales' });
    }

    await pool.query('DELETE FROM channels WHERE id = ? AND group_id = ?', [
      req.params.channelId,
      req.params.groupId,
    ]);
    res.json({ success: true, data: { message: 'Canal eliminado' } });
  } catch (err) {
    console.error('Delete channel error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
