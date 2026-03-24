const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../src/config/db');

(async () => {
  try {
    await pool.query('ALTER TABLE messages ADD COLUMN edited_at DATETIME DEFAULT NULL');
    console.log('OK: messages.edited_at added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('SKIP: messages.edited_at already exists');
    else console.log('ERR:', e.message);
  }
  try {
    await pool.query('ALTER TABLE group_messages ADD COLUMN edited_at DATETIME DEFAULT NULL');
    console.log('OK: group_messages.edited_at added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('SKIP: group_messages.edited_at already exists');
    else console.log('ERR:', e.message);
  }
  await pool.end();
  process.exit(0);
})();
