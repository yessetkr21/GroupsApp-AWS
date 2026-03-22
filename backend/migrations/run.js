const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  const sql = fs.readFileSync(path.join(__dirname, '001_initial_schema.sql'), 'utf8');

  try {
    await connection.query(sql);
    console.log('Migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrate();
