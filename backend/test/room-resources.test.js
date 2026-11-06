const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');

const resources = [
  { id: 1, name: 'Projetor' },
  { id: 2, name: 'Computadores' },
  { id: 3, name: 'Quadro branco' },
];

const rooms = [
  { id: 1, name: 'Sala A', floor: 'Térreo', capacity: 30, resources: ['Projetor'] },
  { id: 2, name: 'Laboratório B', floor: '1º andar', capacity: 24, resources: ['Computadores'] },
  {
    id: 3,
    name: 'Sala Multiuso',
    floor: '2º andar',
    capacity: 40,
    resources: ['Projetor', 'Quadro branco'],
  },
];

let server;
let baseUrl;
let capturedReservation;

before(async () => {
  const app = createApp({
    roomsRepository: {
      async list({ minimumCapacity, resourceIds = [] } = {}) {
        return rooms.filter((room) => {
          const matchesCapacity = minimumCapacity === undefined || room.capacity >= minimumCapacity;
          const matchingResourceNames = resources
            .filter((resource) => resourceIds.includes(resource.id))
            .map((resource) => resource.name);
          const matchesResource = resourceIds.length === 0
            || room.resources.some((name) => matchingResourceNames.includes(name));
          return matchesCapacity && matchesResource;
        });
      },
      async create(room) {
        return room;
      },
    },
    resourcesRepository: {
      async list() {
        return resources;
      },
    },
    reservationsRepository: {
      async list() {
        return [];
      },
      async create(reservation) {
        const room = rooms.find((candidate) => candidate.id === reservation.roomId);
        const matchedResources = room.resources.filter((name) => {
          const resource = resources.find((candidate) => candidate.name === name);
          return reservation.requiredResourceIds.includes(resource.id);
        });

        if (matchedResources.length === 0) {
          const error = new Error(
            'A sala selecionada não possui nenhum dos recursos solicitados.',
          );
          error.code = 'ROOM_RESOURCE_MISMATCH';
          throw error;
        }

        capturedReservation = reservation;
        return { id: 1, roomName: 'Sala A', ...reservation };
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

test('GET /api/resources lists the resource catalog', async () => {
  const response = await fetch(`${baseUrl}/api/resources`);

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, resources);
});

test('GET /api/rooms includes rooms that have at least one selected resource', async () => {
  const response = await fetch(`${baseUrl}/api/rooms?minimumCapacity=25&resourceIds=1,2`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result.data.map((room) => room.id), [1, 3]);
});

test('GET /api/rooms rejects invalid resource IDs', async () => {
  const response = await fetch(`${baseUrl}/api/rooms?resourceIds=1,abc`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'Os recursos selecionados são inválidos.',
  });
});

test('reservation form asks for required resources before listing rooms', async () => {
  const response = await fetch(`${baseUrl}/solicitar-reserva.html`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Recursos necessários/);
  assert.match(html, /resource-options/);
});

test('POST /api/reservations requires at least one selected resource', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 1,
      studentCount: 20,
      requiredResourceIds: [1],
      date: '2026-11-20',
      startTime: '09:00',
      endTime: '10:00',
      responsible: 'Joana Silva',
      purpose: 'Aula',
      requiredResourceIds: [],
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'Selecione pelo menos um recurso necessário.',
  });
});

test('POST /api/reservations sends selected resource IDs for server validation', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 1,
      studentCount: 20,
      requiredResourceIds: [1, 2],
      date: '2026-11-20',
      startTime: '09:00',
      endTime: '10:00',
      responsible: 'Joana Silva',
      purpose: 'Aula',
      requiredResourceIds: [1, 2],
    }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(capturedReservation.requiredResourceIds, [1, 2]);
});

test('POST /api/reservations rejects a room without any selected resource', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 1,
      studentCount: 20,
      requiredResourceIds: [2],
      date: '2026-11-20',
      startTime: '09:00',
      endTime: '10:00',
      responsible: 'Joana Silva',
      purpose: 'Aula',
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'A sala selecionada não possui nenhum dos recursos solicitados.',
  });
});
