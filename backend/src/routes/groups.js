const logger = require('../config/logger');
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/groups
router.post('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Nombre requerido' });

    await conn.beginTransaction();
    const groupId = uuidv4();
    await conn.execute(
      'INSERT INTO `groups` (id, name, description, created_by) VALUES (?, ?, ?, ?)',
      [groupId, name.trim(), description || '', req.user.id]
    );
    await conn.execute(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, req.user.id, 'admin']
    );
    await conn.commit();

    const [[group]] = await conn.execute('SELECT * FROM `groups` WHERE id = ?', [groupId]);
    res.status(201).json({ success: true, data: { ...group, role: 'admin' } });
  } catch (err) {
    await conn.rollback();
    logger.error('Create group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  } finally {
    conn.release();
  }
});

// GET /api/groups
router.get('/', auth, async (req, res) => {
  try {
    const [groups] = await pool.execute(
      `SELECT g.*, gm.role,
        (SELECT content FROM group_messages WHERE group_id = g.id AND channel_id IS NULL ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM group_messages WHERE group_id = g.id AND channel_id IS NULL ORDER BY created_at DESC LIMIT 1) AS last_message_at
       FROM \`groups\` g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?
       ORDER BY COALESCE(last_message_at, g.created_at) DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: groups });
  } catch (err) {
    logger.error('List groups error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/groups/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [[group]] = await pool.execute(
      `SELECT g.*, gm.role FROM \`groups\` g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE g.id = ? AND gm.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!group) return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
    res.json({ success: true, data: group });
  } catch (err) {
    logger.error('Get group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// PUT /api/groups/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const [[member]] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!member || member.role !== 'admin') return res.status(403).json({ success: false, error: 'Solo admin puede editar' });

    const { name, description } = req.body;
    await pool.execute(
      'UPDATE `groups` SET name = ?, description = ? WHERE id = ?',
      [name || '', description || '', req.params.id]
    );
    res.json({ success: true, data: { message: 'Grupo actualizado' } });
  } catch (err) {
    logger.error('Update group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [[member]] = await conn.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!member || member.role !== 'admin') return res.status(403).json({ success: false, error: 'Solo admin puede eliminar' });

    await conn.beginTransaction();
    const [chans] = await conn.execute('SELECT id FROM channels WHERE group_id = ?', [req.params.id]);
    for (const ch of chans) {
      await conn.execute('DELETE FROM group_messages WHERE channel_id = ?', [ch.id]);
    }
    await conn.execute('DELETE FROM group_messages WHERE group_id = ?', [req.params.id]);
    await conn.execute('DELETE FROM channels WHERE group_id = ?', [req.params.id]);
    await conn.execute('DELETE FROM group_members WHERE group_id = ?', [req.params.id]);
    await conn.execute('DELETE FROM `groups` WHERE id = ?', [req.params.id]);
    await conn.commit();

    res.json({ success: true, data: { message: 'Grupo eliminado' } });
  } catch (err) {
    await conn.rollback();
    logger.error('Delete group error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  } finally {
    conn.release();
  }
});

// GET /api/groups/:id/members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const [members] = await pool.execute(
      `SELECT u.id, u.username, u.name, u.email, u.profile_picture, u.is_online, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [req.params.id]
    );
    res.json({ success: true, data: members });
  } catch (err) {
    logger.error('List members error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/groups/:id/members
router.post('/:id/members', auth, async (req, res) => {
  try {
    const [[requester]] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!requester || requester.role !== 'admin') return res.status(403).json({ success: false, error: 'Solo admin puede agregar' });

    const { user_id, username } = req.body;
    if (!user_id && !username) return res.status(400).json({ success: false, error: 'user_id o username requerido' });

    const [[target]] = user_id
      ? await pool.execute('SELECT id FROM users WHERE id = ?', [user_id])
      : await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (!target) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

    await pool.execute(
      'INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [req.params.id, target.id, 'member']
    );
    res.status(201).json({ success: true, data: { message: 'Miembro agregado' } });
  } catch (err) {
    logger.error('Add member error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:id/members/:userId
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const [[requester]] = await pool.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!requester || requester.role !== 'admin') return res.status(403).json({ success: false, error: 'Solo admin puede remover' });

    await pool.execute(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    res.json({ success: true, data: { message: 'Miembro removido' } });
  } catch (err) {
    logger.error('Remove member error:', { error: err.message });
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
