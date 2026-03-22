const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function fix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const queries = [
    'ALTER TABLE `groups` ADD COLUMN is_public BOOLEAN DEFAULT TRUE',
    `CREATE TABLE IF NOT EXISTS channels (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      group_id VARCHAR(36) NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT DEFAULT NULL,
      created_by VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES \`groups\`(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const q of queries) {
    try {
      await conn.query(q);
      console.log('OK:', q.substring(0, 60));
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('SKIP:', q.substring(0, 60));
      } else {
        console.error('ERR:', err.code, err.message.substring(0, 100));
      }
    }
  }

  await conn.end();
  console.log('Done!');
}

fix();
