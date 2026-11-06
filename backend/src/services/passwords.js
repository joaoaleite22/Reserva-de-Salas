const bcrypt = require('bcryptjs');

const saltRounds = 12;
const maximumPasswordBytes = 72;
const minimumPasswordLength = 12;

/**
 * Creates a bcrypt hash for a password supplied by an administrator.
 *
 * @param {string} password Plain-text password that will not be persisted.
 * @returns {Promise<string>} A bcrypt hash suitable for `usuarios.senha_hash`.
 * @throws {TypeError} If the password does not meet the supported length.
 */
async function hashPassword(password) {
  if (
    typeof password !== 'string'
    || password.length < minimumPasswordLength
    || Buffer.byteLength(password, 'utf8') > maximumPasswordBytes
  ) {
    throw new TypeError(
      `A senha deve ter ao menos ${minimumPasswordLength} caracteres e até ${maximumPasswordBytes} bytes.`,
    );
  }

  return bcrypt.hash(password, saltRounds);
}

/**
 * Checks a submitted password against a stored bcrypt hash.
 *
 * @param {string} password Password submitted at login.
 * @param {string} passwordHash Hash loaded from the users repository.
 * @returns {Promise<boolean>} Whether the password matches the hash.
 */
function verifyPassword(password, passwordHash) {
  if (
    typeof password !== 'string'
    || Buffer.byteLength(password, 'utf8') > maximumPasswordBytes
    || typeof passwordHash !== 'string'
  ) {
    return Promise.resolve(false);
  }

  return bcrypt.compare(password, passwordHash);
}

module.exports = { hashPassword, verifyPassword };
