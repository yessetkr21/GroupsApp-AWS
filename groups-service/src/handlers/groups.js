const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

function toStr(v) { return v == null ? '' : String(v); }
function toInt(v) { return v == null ? 0  : Number(v); }
function toBool(v){ return Boolean(v); }
function toDate(v){ return v ? new Date(v).toISOString() : ''; }

function rowToGroup(row) {
  return {
    id:              toStr(row.id),
    name:            toStr(row.name),
    description:     toStr(row.description),
    created_by:      toStr(row.created_by),
    role:            toStr(row.role),
    member_count:    toInt(row.member_count),
    last_message:    toStr(row.last_message),
    last_message_at: toDate(row.last_message_at),
    created_at:      toDate(row.created_at),
  };
}

function rowToMember(row) {
  return {
    id:        toStr(row.id),
    username:  toStr(row.username),
    email:     toStr(row.email),
    avatar_url:toStr(row.avatar_url),
    is_online: toBool(row.is_online),
    last_seen: toDate(row.last_seen),
    role:      toStr(row.role),
    joined_at: toDate(row.joined_at),
  };
}

function rowToChannel(row) {
  return {
    id:          toStr(row.id),
    group_id:    toStr(row.group_id),
    name:        toStr(row.name),
    description: toStr(row.description),
    created_by:  toStr(row.created_by),
    created_at:  toDate(row.created_at),
    last_message:toStr(row.last_message),
  };
}

// ── Groups ────────────────────────────────────────────────────────────────────

async function createGroup(call, callback) {
  try {
    const { name, description, user_id } = call.request;
    if (!name) return callback(null, { success: false, error: 'Nombre del grupo requerido' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO `groups` (id, name, description, created_by, join_mode) VALUES (?, ?, ?, ?, ?)',
      [id, name, description || null, user_id, 'open']
    );
    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [id, user_id, 'admin']
    );
    const channelId = uuidv4();
    await pool.query(
      'INSERT INTO channels (id, group_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [channelId, id, 'general', 'Canal general', user_id]
    );

    callback(null, {
      success: true,
      group: { id, name, description: description || '', created_by: user_id, role: 'admin', member_count: 1 },
      error: '',
    });
  } catch (err) {
    logger.error('[groups-service] createGroup error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

async function getGroups(call, callback) {
  try {
    const { user_id } = call.request;
    const [rows] = await pool.query(
      `SELECT g.*, gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
        (SELECT content FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM group_messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
      FROM \`groups\` g
      JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
      ORDER BY last_message_at DESC, g.created_at DESC`,
      [user_id]
    );
    callback(null, { success: true, groups: rows.map(rowToGroup), error: '' });
  } catch (err) {
    logger.error('[groups-service] getGroups error:', { error: err.message });
    callback(null, { success: false, groups: [], error: 'Error del servidor' });
  }
}

async function getGroup(call, callback) {
  try {
    const { group_id, user_id } = call.request;
    const [rows] = await pool.query(
      `SELECT g.*, gm.role FROM \`groups\` g
       JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = ?
       WHERE g.id = ?`,
      [user_id, group_id]
    );
    if (rows.length === 0) return callback(null, { success: false, error: 'Grupo no encontrado' });
    callback(null, { success: true, group: rowToGroup(rows[0]), error: '' });
  } catch (err) {
    logger.error('[groups-service] getGroup error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

async function updateGroup(call, callback) {
  try {
    const { group_id, user_id, name, description } = call.request;
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [group_id, user_id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin')
      return callback(null, { success: false, error: 'Solo el admin puede editar el grupo' });

    await pool.query(
      'UPDATE `groups` SET name = COALESCE(NULLIF(?, \'\'), name), description = COALESCE(NULLIF(?, \'\'), description) WHERE id = ?',
      [name, description, group_id]
    );
    callback(null, { success: true, message: 'Grupo actualizado', error: '' });
  } catch (err) {
    logger.error('[groups-service] updateGroup error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

async function deleteGroup(call, callback) {
  try {
    const { group_id, user_id } = call.request;
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [group_id, user_id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin')
      return callback(null, { success: false, error: 'Solo el admin puede eliminar el grupo' });

    await pool.query('DELETE FROM `groups` WHERE id = ?', [group_id]);
    callback(null, { success: true, message: 'Grupo eliminado', error: '' });
  } catch (err) {
    logger.error('[groups-service] deleteGroup error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

// ── Members ───────────────────────────────────────────────────────────────────

async function getMembers(call, callback) {
  try {
    const { group_id } = call.request;
    const [rows] = await pool.query(
      `SELECT u.id, u.name AS username, u.email, u.profile_picture AS avatar_url,
              u.is_online, u.last_seen, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.role DESC, u.name`,
      [group_id]
    );
    callback(null, { success: true, members: rows.map(rowToMember), error: '' });
  } catch (err) {
    logger.error('[groups-service] getMembers error:', { error: err.message });
    callback(null, { success: false, members: [], error: 'Error del servidor' });
  }
}

async function addMember(call, callback) {
  try {
    const { group_id, user_id, target_user_id, target_username } = call.request;
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [group_id, user_id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin')
      return callback(null, { success: false, error: 'Solo el admin puede agregar miembros' });

    let targetId = target_user_id;
    if (!targetId && target_username) {
      const [users] = await pool.query('SELECT id FROM users WHERE name = ?', [target_username]);
      if (users.length === 0)
        return callback(null, { success: false, error: 'Usuario no encontrado' });
      targetId = users[0].id;
    }
    if (!targetId) return callback(null, { success: false, error: 'user_id o username requerido' });

    await pool.query(
      'INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [group_id, targetId, 'member']
    );
    callback(null, { success: true, message: 'Miembro agregado', error: '' });
  } catch (err) {
    logger.error('[groups-service] addMember error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

async function removeMember(call, callback) {
  try {
    const { group_id, user_id, target_user_id } = call.request;
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [group_id, user_id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin')
      return callback(null, { success: false, error: 'Solo el admin puede remover miembros' });

    await pool.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [group_id, target_user_id]
    );
    callback(null, { success: true, message: 'Miembro removido', error: '' });
  } catch (err) {
    logger.error('[groups-service] removeMember error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

// ── Channels ──────────────────────────────────────────────────────────────────

async function getChannels(call, callback) {
  try {
    const { group_id } = call.request;
    const [rows] = await pool.query(
      `SELECT c.*,
        (SELECT content FROM group_messages WHERE channel_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM channels c WHERE c.group_id = ? ORDER BY c.created_at`,
      [group_id]
    );
    callback(null, { success: true, channels: rows.map(rowToChannel), error: '' });
  } catch (err) {
    logger.error('[groups-service] getChannels error:', { error: err.message });
    callback(null, { success: false, channels: [], error: 'Error del servidor' });
  }
}

async function createChannel(call, callback) {
  try {
    const { group_id, name, description, user_id } = call.request;
    if (!name) return callback(null, { success: false, error: 'Nombre del canal requerido' });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO channels (id, group_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, group_id, name, description || null, user_id]
    );
    callback(null, {
      success: true,
      channel: { id, group_id, name, description: description || '', created_by: user_id },
      error: '',
    });
  } catch (err) {
    logger.error('[groups-service] createChannel error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

async function deleteChannel(call, callback) {
  try {
    const { group_id, channel_id, user_id } = call.request;
    const [membership] = await pool.query(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [group_id, user_id]
    );
    if (membership.length === 0 || membership[0].role !== 'admin')
      return callback(null, { success: false, error: 'Solo el admin puede eliminar canales' });

    await pool.query('DELETE FROM channels WHERE id = ? AND group_id = ?', [channel_id, group_id]);
    callback(null, { success: true, message: 'Canal eliminado', error: '' });
  } catch (err) {
    logger.error('[groups-service] deleteChannel error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

module.exports = {
  createGroup, getGroups, getGroup, updateGroup, deleteGroup,
  getMembers, addMember, removeMember,
  getChannels, createChannel, deleteChannel,
};
