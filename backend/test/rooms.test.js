const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');

const existingRoom = {
  id: 1,
  name: 'Laboratório 01',
  floor: 'Térreo',
  capacity: 24,
  resources: ['Projetor', 'Computadores'],
};

let server;
let baseUrl;
let rooms;

before(async () => {
  rooms = [existingRoom];
  const app = createApp({
    roomsRepository: {
      async list() {
        return rooms;
      },
      async create(room) {
        const created = { id: rooms.length + 1, ...room };
        rooms.push(created);
        return created;
      },
    },
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /api/rooms lists rooms with their resources', async () => {
  const response = await fetch(`${baseUrl}/api/rooms`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    data: [existingRoom],
  });
});

test('GET / serves the frontend entry point', async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Entrar \| reserve\.me/);
});

test('POST /api/rooms trims and creates a room with resources', async () => {
  const response = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '  Sala Multiuso  ',
      floor: '  1º andar ',
      capacity: 30,
      resources: [' Quadro branco ', 'Projetor'],
    }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    ok: true,
    data: {
      id: 2,
      name: 'Sala Multiuso',
      floor: '1º andar',
      capacity: 30,
      resources: ['Quadro branco', 'Projetor'],
    },
  });
});

test('POST /api/rooms rejects invalid room data', async () => {
  const response = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sala sem capacidade válida',
      floor: 'Térreo',
      capacity: 0,
      resources: ['Projetor'],
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'A capacidade deve ser um número inteiro maior que zero.',
  });
});

test('POST /api/rooms rejects resources that are not a list of names', async () => {
  const response = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sala válida',
      floor: 'Térreo',
      capacity: 20,
      resources: 'Projetor',
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'Os recursos devem ser informados em uma lista de nomes.',
  });
});
