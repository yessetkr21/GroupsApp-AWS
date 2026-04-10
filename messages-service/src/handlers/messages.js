const logger = require('../config/logger');
const pool = require('../config/db');

// Helper: convert MySQL row to gRPC Message object
function rowToMessage(row) {
  return {
    id:              row.id              || '',
    sender_id:       row.sender_id       || '',
    sender_username: row.sender_username || '',
    sender_avatar:   row.sender_avatar   || '',
    group_id:        row.group_id        || '',
    channel_id:      row.channel_id      || '',
    receiver_id:     row.receiver_id     || '',
    content:         row.content         || '',
    message_type:    row.message_type    || 'text',
    file_url:        row.file_url        || '',
    file_name:       row.file_name       || '',
    status:          row.status          || 'sent',
    created_at:      row.created_at ? new Date(row.created_at).toISOString() : '',
    is_read:         row.is_read ? Boolean(row.is_read) : false,
  };
}

// GET group messages (group_messages table, no channel)
async function getGroupMessages(call, callback) {
  try {
    const { group_id, limit = 50, before } = call.request;

    let query = `
      SELECT gm.*, u.name AS sender_username, u.profile_picture AS sender_avatar
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.group_id = ? AND (gm.channel_id IS NULL OR gm.channel_id = '')
    `;
    const params = [group_id];

    if (before) {
      query += ' AND gm.created_at < ?';
      params.push(before);
    }
    query += ' ORDER BY gm.created_at DESC LIMIT ?';
    params.push(limit || 50);

    const [rows] = await pool.query(query, params);
    callback(null, {
      success: true,
      messages: rows.reverse().map(rowToMessage),
      error: '',
    });
  } catch (err) {
    logger.error('[messages-service] getGroupMessages error:', { error: err.message });
    callback(null, { success: false, messages: [], error: 'Error del servidor' });
  }
}

// GET channel messages (group_messages table, with channel_id)
async function getChannelMessages(call, callback) {
  try {
    const { channel_id, limit = 50, before } = call.request;

    let query = `
      SELECT gm.*, u.name AS sender_username, u.profile_picture AS sender_avatar
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.channel_id = ?
    `;
    const params = [channel_id];

    if (before) {
      query += ' AND gm.created_at < ?';
      params.push(before);
    }
    query += ' ORDER BY gm.created_at DESC LIMIT ?';
    params.push(limit || 50);

    const [rows] = await pool.query(query, params);
    callback(null, {
      success: true,
      messages: rows.reverse().map(rowToMessage),
      error: '',
    });
  } catch (err) {
    logger.error('[messages-service] getChannelMessages error:', { error: err.message });
    callback(null, { success: false, messages: [], error: 'Error del servidor' });
  }
}

// GET direct messages (messages table)
async function getDirectMessages(call, callback) {
  try {
    const { user_id, other_user_id, limit = 50, before } = call.request;

    let query = `
      SELECT m.*, m.\`read\` AS is_read, u.name AS sender_username, u.profile_picture AS sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
    `;
    const params = [user_id, other_user_id, other_user_id, user_id];

    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit || 50);

    const [rows] = await pool.query(query, params);
    const mapped = rows.map((m) => ({
      ...m,
      status: m.is_read ? 'read' : (m.status || 'sent'),
    }));
    callback(null, {
      success: true,
      messages: mapped.reverse().map(rowToMessage),
      error: '',
    });
  } catch (err) {
    logger.error('[messages-service] getDirectMessages error:', { error: err.message });
    callback(null, { success: false, messages: [], error: 'Error del servidor' });
  }
}

module.exports = { getGroupMessages, getChannelMessages, getDirectMessages };
