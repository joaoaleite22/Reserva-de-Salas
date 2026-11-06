const { pool } = require('../database/pool');

async function list() {
  const [rows] = await pool.query(
    'SELECT id, nome AS name FROM recursos ORDER BY nome',
  );

  return rows;
}

module.exports = { list };
