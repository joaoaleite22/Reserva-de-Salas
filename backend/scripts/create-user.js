const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { create } = require('../src/repositories/usersRepository');
const { hashPassword } = require('../src/services/passwords');

const name = process.env.NEW_USER_NAME?.trim();
const email = process.env.NEW_USER_EMAIL?.trim().toLowerCase();
const password = process.env.NEW_USER_PASSWORD;
const role = process.env.NEW_USER_ROLE || 'professor';
const validRoles = new Set(['professor', 'gerente']);

async function main() {
  if (!name || name.length > 120) {
    throw new Error('NEW_USER_NAME é obrigatório e deve ter até 120 caracteres.');
  }

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('NEW_USER_EMAIL deve conter um e-mail válido.');
  }

  if (!validRoles.has(role)) {
    throw new Error('NEW_USER_ROLE deve ser professor ou gerente.');
  }

  const passwordHash = await hashPassword(password);
  const userId = await create({ name, email, passwordHash, role });
  console.log(`Usuário criado com ID ${userId}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { pool } = require('../src/database/pool');
    await pool.end();
  });
