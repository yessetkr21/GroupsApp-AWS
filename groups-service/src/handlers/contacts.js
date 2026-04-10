const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

function toStr(v) { return v == null ? '' : String(v); }
function toBool(v){ return Boolean(v); }
function toDate(v){ return v ? new Date(v).toISOString() : ''; }

function rowToContact(row) {
  return {
    id:            toStr(row.id),
    username:      toStr(row.username),
    email:         toStr(row.email),
    avatar_url:    toStr(row.avatar_url),
    is_online:     toBool(row.is_online),
    last_seen:     toDate(row.last_seen),
    contact_since: toDate(row.contact_since),
  };
}

async function getContacts(call, callback) {
  try {
    const { user_id } = call.request;
    const [rows] = await pool.query(
      `SELECT u.id, u.name AS username, u.email, u.profile_picture AS avatar_url,
              u.is_online, u.last_seen, c.created_at AS contact_since
       FROM contacts c
       JOIN users u ON c.contact_user_id = u.id
       WHERE c.user_id = ?
       ORDER BY u.name`,
      [user_id]
    );
    callback(null, { success: true, contacts: rows.map(rowToContact), error: '' });
  } catch (err) {
    logger.error('[groups-service] getContacts error:', { error: err.message });
    callback(null, { success: false, contacts: [], error: 'Error del servidor' });
  }
}

async function addContact(call, callback) {
  try {
    const { user_id, target_username } = call.request;
    if (!target_username)
      return callback(null, { success: false, error: 'Username requerido' });

    const [users] = await pool.query(
      'SELECT id, name AS username, email, profile_picture AS avatar_url, is_online, last_seen FROM users WHERE name = ?',
      [target_username]
    );
    if (users.length === 0)
      return callback(null, { success: false, error: 'Usuario no encontrado' });

    const target = users[0];
    if (target.id === user_id)
      return callback(null, { success: false, error: 'No puedes agregarte a ti mismo' });

    // Bidirectional contact
    await pool.query(
      'INSERT IGNORE INTO contacts (id, user_id, contact_user_id) VALUES (?, ?, ?)',
      [uuidv4(), user_id, target.id]
    );
    await pool.query(
      'INSERT IGNORE INTO contacts (id, user_id, contact_user_id) VALUES (?, ?, ?)',
      [uuidv4(), target.id, user_id]
    );

    // Fetch adder info so the api-gateway can emit a Socket.IO notification
    const [adderRows] = await pool.query(
      'SELECT id, name AS username, email, profile_picture AS avatar_url, is_online, last_seen FROM users WHERE id = ?',
      [user_id]
    );

    callback(null, {
      success: true,
      contact: rowToContact({ ...target, contact_since: new Date() }),
      added_user_id:   target.id,
      adder_info_json: adderRows.length > 0 ? JSON.stringify(adderRows[0]) : '{}',
      error: '',
    });
  } catch (err) {
    logger.error('[groups-service] addContact error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

async function deleteContact(call, callback) {
  try {
    const { user_id, target_user_id } = call.request;
    await pool.query(
      'DELETE FROM contacts WHERE (user_id = ? AND contact_user_id = ?) OR (user_id = ? AND contact_user_id = ?)',
      [user_id, target_user_id, target_user_id, user_id]
    );
    callback(null, { success: true, message: 'Contacto eliminado', error: '' });
  } catch (err) {
    logger.error('[groups-service] deleteContact error:', { error: err.message });
    callback(null, { success: false, error: 'Error del servidor' });
  }
}

async function searchUsers(call, callback) {
  try {
    const { query, user_id } = call.request;
    if (!query) return callback(null, { success: false, users: [], error: 'Query requerida' });

    const [rows] = await pool.query(
      'SELECT id, name AS username, email, profile_picture AS avatar_url FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 20',
      [`%${query}%`, `%${query}%`, user_id]
    );
    callback(null, {
      success: true,
      users: rows.map((r) => ({
        id:        toStr(r.id),
        username:  toStr(r.username),
        email:     toStr(r.email),
        avatar_url:toStr(r.avatar_url),
        is_online: false,
        last_seen: '',
        contact_since: '',
      })),
      error: '',
    });
  } catch (err) {
    logger.error('[groups-service] searchUsers error:', { error: err.message });
    callback(null, { success: false, users: [], error: 'Error del servidor' });
  }
}

module.exports = { getContacts, addContact, deleteContact, searchUsers };
