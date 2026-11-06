const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const { assertRoomCapacity } = require('../src/domain/reservations');

const rooms = [
  { id: 1, name: 'Sala pequena', floor: 'Térreo', capacity: 15, resources: [] },
  { id: 2, name: 'Sala média', floor: '1º andar', capacity: 30, resources: [] },
  { id: 3, name: 'Auditório', floor: '2º andar', capacity: 100, resources: [] },
];

let server;
let baseUrl;
let createdReservation;

before(async () => {
  const app = createApp({
    roomsRepository: {
      async list({ minimumCapacity } = {}) {
        return rooms.filter((room) => (
          minimumCapacity === undefined || room.capacity >= minimumCapacity
        ));
      },
      async create(room) {
        return room;
      },
    },
    reservationsRepository: {
      async list() {
        return [];
      },
      async create(reservation) {
        assertRoomCapacity(
          rooms.find((room) => room.id === reservation.roomId).capacity,
          reservation.studentCount,
        );
        createdReservation = reservation;
        return {
          id: 1,
          roomName: rooms.find((room) => room.id === reservation.roomId).name,
          ...reservation,
        };
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

test('GET /api/rooms filters rooms by minimum capacity', async () => {
  const response = await fetch(`${baseUrl}/api/rooms?minimumCapacity=30`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result.data.map((room) => room.id), [2, 3]);
  assert.ok(result.data.every((room) => room.capacity >= 30));
});

test('GET /api/rooms rejects invalid minimum capacity filters', async () => {
  const response = await fetch(`${baseUrl}/api/rooms?minimumCapacity=0`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'A quantidade de alunos deve ser um número inteiro maior que zero.',
  });
});

test('GET /solicitar-reserva.html serves the student-count reservation form', async () => {
  const response = await fetch(`${baseUrl}/solicitar-reserva.html`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Quantidade de alunos/);
  assert.match(html, /Sala disponível/);
});

test('POST /api/reservations requires a student count', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 2,
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
    message: 'Informe a quantidade de alunos como um número inteiro maior que zero.',
  });
});

test('POST /api/reservations stores the student count', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 2,
      studentCount: 28,
      requiredResourceIds: [1],
      date: '2026-11-20',
      startTime: '09:00',
      endTime: '10:00',
      responsible: 'Joana Silva',
      purpose: 'Aula',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(createdReservation.studentCount, 28);
});

test('POST /api/reservations blocks a room with insufficient capacity', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 2,
      studentCount: 31,
      requiredResourceIds: [1],
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
    message: 'A quantidade de alunos excede a capacidade da sala selecionada.',
  });
});
