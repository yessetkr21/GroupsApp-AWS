const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/groups/:groupId/channels
router.get('/:groupId/channels', auth, async (req, res) => {
  try {
    const [channels] = await pool.execute(
      'SELECT * FROM channels WHERE group_id = ? ORDER BY created_at ASC',
      [req.params.groupId]
    );
    res.json({ success: true, data: channels });
  } catch (err) {
    logger.error('List channels error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/groups/:groupId/channels
router.post('/:groupId/channels', auth, async (req, res) => {
  try {
    const [[member]] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.groupId, req.user.id]
    );
    if (!member || member.role !== 'admin') return res.status(403).json({ success: false, error: 'Solo admin puede crear canales' });

    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Nombre requerido' });

    const channelId = uuidv4();
    await pool.execute(
      'INSERT INTO channels (id, group_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [channelId, req.params.groupId, name.trim(), description || '', req.user.id]
    );
    const [[channel]] = await pool.execute('SELECT * FROM channels WHERE id = ?', [channelId]);
    res.status(201).json({ success: true, data: channel });
  } catch (err) {
    logger.error('Create channel error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:groupId/channels/:channelId
router.delete('/:groupId/channels/:channelId', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [[member]] = await conn.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.groupId, req.user.id]
    );
    if (!member || member.role !== 'admin') return res.status(403).json({ success: false, error: 'Solo admin puede eliminar canales' });

    await conn.beginTransaction();
    await conn.execute('DELETE FROM group_messages WHERE channel_id = ?', [req.params.channelId]);
    await conn.execute('DELETE FROM channels WHERE id = ? AND group_id = ?', [req.params.channelId, req.params.groupId]);
    await conn.commit();

    res.json({ success: true, data: { message: 'Canal eliminado' } });
  } catch (err) {
    await conn.rollback();
    logger.error('Delete channel error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  } finally {
    conn.release();
  }
});

module.exports = router;
