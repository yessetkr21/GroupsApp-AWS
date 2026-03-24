const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

async function loadReactions(messageIds) {
  if (messageIds.length === 0) return {};
  const ph = messageIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT message_id, emoji, COUNT(*) as count, JSON_ARRAYAGG(JSON_OBJECT('user_id', user_id)) as users FROM message_reactions WHERE message_id IN (${ph}) GROUP BY message_id, emoji`, messageIds
  );
  const map = {};
  rows.forEach((r) => {
    if (!map[r.message_id]) map[r.message_id] = [];
    map[r.message_id].push({ emoji: r.emoji, count: r.count, users: typeof r.users === 'string' ? JSON.parse(r.users) : r.users });
  });
  return map;
}

// GET /api/messages/group/:groupId — historial de grupo (group_messages table)
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;

    let query = `
      SELECT gm.*, u.name as sender_username, u.profile_picture as sender_avatar
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.group_id = ? AND (gm.channel_id IS NULL OR gm.channel_id = '')
    `;
    const params = [req.params.groupId];

    if (before) {
      query += ' AND gm.created_at < ?';
      params.push(before);
    }

    query += ' ORDER BY gm.created_at DESC LIMIT ?';
    params.push(limit);

    const [messages] = await pool.query(query, params);
    const rm = await loadReactions(messages.map((m) => m.id));
    res.json({ success: true, data: messages.reverse().map((m) => ({ ...m, reactions: rm[m.id] || [] })) });
  } catch (err) {
    console.error('Get group messages error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/messages/channel/:channelId — historial de canal
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;

    let query = `
      SELECT gm.*, u.name as sender_username, u.profile_picture as sender_avatar
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.channel_id = ?
    `;
    const params = [req.params.channelId];

    if (before) {
      query += ' AND gm.created_at < ?';
      params.push(before);
    }

    query += ' ORDER BY gm.created_at DESC LIMIT ?';
    params.push(limit);

    const [messages] = await pool.query(query, params);
    const rm = await loadReactions(messages.map((m) => m.id));
    res.json({ success: true, data: messages.reverse().map((m) => ({ ...m, reactions: rm[m.id] || [] })) });
  } catch (err) {
    console.error('Get channel messages error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// GET /api/messages/dm/:userId — historial DM (messages table)
router.get('/dm/:userId', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;

    let query = `
      SELECT m.*, m.\`read\` as is_read, u.name as sender_username, u.profile_picture as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    `;
    const params = [req.user.id, req.params.userId, req.params.userId, req.user.id];

    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const [messages] = await pool.query(query, params);
    // Map `read` field to status for consistency
    const mapped = messages.map((m) => ({
      ...m,
      status: m.is_read ? 'read' : (m.status || 'sent'),
    }));
    const rm = await loadReactions(mapped.map((m) => m.id));
    res.json({ success: true, data: mapped.reverse().map((m) => ({ ...m, reactions: rm[m.id] || [] })) });
  } catch (err) {
    console.error('Get DM messages error:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

module.exports = router;
