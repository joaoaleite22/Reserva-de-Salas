const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'reserve_user',
  password: process.env.DB_PASSWORD || 'reserve_password',
  database: process.env.DB_NAME || 'reserve_me',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = { pool };
