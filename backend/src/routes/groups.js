const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/groups
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nombre del grupo requerido' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO `groups` (id, name, description, created_by, join_mode) VALUES (?, ?, ?, ?, ?)',
      [id, name, description || null, req.user.id, 'open']
    );

    // Creator becomes admin
    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [id, req.user.id, 'admin']
    );

    // Create default "general" channel
    const channelId = uuidv4();
    await pool.query(
      'INSERT INTO channels (id, group_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [channelId, id, 'general', 'Canal general', req.user.id]
    );

    res.status(201).json({
      success: true,
      data: { id, name, description, created_by: req.user.id },
    });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/groups
router.get('/', auth, async (req, res) => {
  try {
    const [groups] = await pool.query(
      `SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
        (SELECT content FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM \`groups\` g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      ORDER BY last_message_at DESC, g.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: groups });
  } catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/groups/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [groups] = await pool.query(
      `SELECT g.*, gm.role FROM \`groups\` g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      WHERE g.id = ?`,
      [req.user.id, req.params.id]
    );
    if (groups.length === 0) {
      return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
    }
    res.json({ success: true, data: groups[0] });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// PUT /api/groups/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo el admin puede editar el grupo' });
    }

    const { name, description } = req.body;
    await pool.query(
      'UPDATE `groups` SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
      [name, description, req.params.id]
    );
    res.json({ success: true, data: { message: 'Grupo actualizado' } });
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo el admin puede eliminar el grupo' });
    }

    await pool.query('DELETE FROM `groups` WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'Grupo eliminado' } });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/groups/:id/members
router.get('/:id/members', auth, async (req, res) => {
  try {
    const [members] = await pool.query(
      `SELECT u.id, u.name as username, u.email, u.profile_picture as avatar_url, u.is_online, u.last_seen, gm.role, gm.joined_at
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.role DESC, u.name`,
      [req.params.id]
    );
    res.json({ success: true, data: members });
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// POST /api/groups/:id/members
router.post('/:id/members', auth, async (req, res) => {
  try {
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo el admin puede agregar miembros' });
    }

    const { user_id, username } = req.body;
    let targetUserId = user_id;

    if (!targetUserId && username) {
      const [users] = await pool.query('SELECT id FROM users WHERE name = ?', [username]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      }
      targetUserId = users[0].id;
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'user_id o username requerido' });
    }

    await pool.query(
      'INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [req.params.id, targetUserId, 'member']
    );
    res.status(201).json({ success: true, data: { message: 'Miembro agregado' } });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// DELETE /api/groups/:id/members/:userId
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Solo el admin puede remover miembros' });
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    res.json({ success: true, data: { message: 'Miembro removido' } });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
