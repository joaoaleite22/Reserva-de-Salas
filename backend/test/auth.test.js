const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/authService');

const secret = 'test-secret-with-at-least-thirty-two-characters';
const storedUser = {
  id: 12,
  nome: 'Professora Exemplo',
  email: 'professora@escola.edu.br',
  senha_hash: '',
  perfil: 'professor',
  ativo: 1,
};

let server;
let baseUrl;
let authService;

before(async () => {
  storedUser.senha_hash = await bcrypt.hash('senha-correta', 4);
  authService = createAuthService({
    usersRepository: {
      async findByEmail(email) {
        return email === storedUser.email ? storedUser : null;
      },
    },
    secret,
  });

  const app = createApp({ authService });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function login(body) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('POST /api/auth/login authenticates a valid user and returns a signed token', async () => {
  const response = await login({
    email: ' PROFESSORA@ESCOLA.EDU.BR ',
    password: 'senha-correta',
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.user.id, storedUser.id);
  assert.equal(result.user.name, storedUser.nome);
  assert.equal(result.user.email, storedUser.email);
  assert.equal(result.user.role, storedUser.perfil);
  assert.equal(Object.hasOwn(result.user, 'senha_hash'), false);

  const decodedToken = jwt.verify(result.token, secret, {
    issuer: 'reserve.me',
    audience: 'reserve.me',
  });
  assert.equal(decodedToken.sub, String(storedUser.id));
  assert.equal(decodedToken.exp - decodedToken.iat, 60 * 60);
});

test('POST /api/auth/login rejects invalid credentials with a generic response', async () => {
  const response = await login({
    email: storedUser.email,
    password: 'senha-incorreta',
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'E-mail ou senha inválidos.',
  });
});

test('POST /api/auth/login rejects an unknown email with the same generic response', async () => {
  const response = await login({
    email: 'desconhecido@escola.edu.br',
    password: 'senha-incorreta',
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'E-mail ou senha inválidos.',
  });
});

test('POST /api/auth/login rejects disabled accounts', async () => {
  storedUser.ativo = 0;
  const response = await login({
    email: storedUser.email,
    password: 'senha-correta',
  });
  storedUser.ativo = 1;

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'E-mail ou senha inválidos.',
  });
});

test('POST /api/auth/login validates required fields and email format', async () => {
  const missingPassword = await login({ email: storedUser.email });
  const invalidEmail = await login({ email: 'invalido', password: 'senha' });

  assert.equal(missingPassword.status, 400);
  assert.equal(invalidEmail.status, 400);
});

test('auth service hashes passwords and verifies them without storing plain text', async () => {
  const { hashPassword, verifyPassword } = require('../src/services/passwords');
  const passwordHash = await hashPassword('senha-forte-12');

  assert.notEqual(passwordHash, 'senha-forte-12');
  assert.equal(await verifyPassword('senha-forte-12', passwordHash), true);
  assert.equal(await verifyPassword('senha-errada', passwordHash), false);
  await assert.rejects(() => hashPassword('curta'), TypeError);
});

test('auth service refuses a missing or weak JWT secret', async () => {
  const service = createAuthService({
    usersRepository: { async findByEmail() { return null; } },
    secret: 'fraco',
  });

  await assert.rejects(
    () => service.authenticate('professora@escola.edu.br', 'senha'),
    /AUTH_TOKEN_SECRET/,
  );
});
