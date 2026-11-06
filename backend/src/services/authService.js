const jwt = require('jsonwebtoken');
const defaultUsersRepository = require('../repositories/usersRepository');
const { verifyPassword } = require('./passwords');

const issuer = 'reserve.me';
const audience = 'reserve.me';
const tokenLifetime = '1h';
const minimumSecretBytes = 32;

/**
 * Safe identity data returned to clients after authentication.
 *
 * @typedef {object} AuthenticatedUser
 * @property {number} id Database user identifier.
 * @property {string} name Display name.
 * @property {string} email Normalized email address.
 * @property {'professor'|'gerente'} role Application role.
 */

/**
 * Login result returned by the authentication service.
 *
 * @typedef {object} AuthenticationResult
 * @property {string} token Signed JWT access token.
 * @property {AuthenticatedUser} user Safe account profile.
 */

/**
 * Builds an authentication service backed by the user repository.
 *
 * @param {object} [options] Service dependencies.
 * @param {object} [options.usersRepository] Repository that loads user accounts.
 * @param {string} [options.secret] JWT signing secret; defaults to AUTH_TOKEN_SECRET.
 * @returns {{authenticate: Function}} Authentication service exposing `authenticate(email, password)`.
 */
function createAuthService({
  usersRepository = defaultUsersRepository,
  secret = process.env.AUTH_TOKEN_SECRET,
} = {}) {
  /**
   * Validates credentials and signs a short-lived access token.
   *
   * @param {string} email Email supplied by the user.
   * @param {string} password Password supplied by the user.
   * @returns {Promise<AuthenticationResult|null>} Token and safe user profile, or null.
   * @throws {Error} When authentication secret is missing or too short.
   */
  async function authenticate(email, password) {
    if (!secret || Buffer.byteLength(secret, 'utf8') < minimumSecretBytes) {
      throw new Error('AUTH_TOKEN_SECRET deve conter pelo menos 32 bytes.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const account = await usersRepository.findByEmail(normalizedEmail);

    if (
      !account
      || !account.ativo
      || !(await verifyPassword(password, account.senha_hash))
    ) {
      return null;
    }

    const user = {
      id: account.id,
      name: account.nome,
      email: account.email,
      role: account.perfil,
    };
    const token = jwt.sign(
      { name: user.name, role: user.role },
      secret,
      {
        subject: String(user.id),
        issuer,
        audience,
        expiresIn: tokenLifetime,
      },
    );

    return { token, user };
  }

  return { authenticate };
}

module.exports = { createAuthService };
