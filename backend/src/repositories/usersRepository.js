const { pool } = require('../database/pool');

/**
 * Looks up a login account by its normalized email address.
 *
 * @param {string} email Lowercase email address.
 * @returns {Promise<object|null>} Account data including its password hash, or null.
 */
async function findByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, nome, email, senha_hash, perfil, ativo
    FROM usuarios
    WHERE email = ?
    LIMIT 1`,
    [email],
  );

  return rows[0] || null;
}

/**
 * Inserts an account created by the administrator tooling.
 *
 * @param {{name: string, email: string, passwordHash: string, role: string}} account Account details.
 * @returns {Promise<number>} Identifier of the inserted account.
 */
async function create(account) {
  const [result] = await pool.execute(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil)
    VALUES (?, ?, ?, ?)`,
    [account.name, account.email, account.passwordHash, account.role],
  );

  return result.insertId;
}

module.exports = { create, findByEmail };
