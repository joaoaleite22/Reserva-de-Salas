const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');

const existingReservation = {
  id: 1,
  roomId: 3,
  roomName: 'Sala 03',
  date: '2026-11-05',
  startTime: '09:00',
  endTime: '10:30',
  responsible: 'Ana Souza',
  purpose: 'Reunião pedagógica',
  status: 'pendente',
};

let server;
let baseUrl;
let reservations;

before(async () => {
  reservations = [existingReservation];
  const app = createApp({
    roomsRepository: {
      async list() { return []; },
      async create(room) { return room; },
    },
    reservationsRepository: {
      async list() { return reservations; },
      async create(reservation) {
        const created = {
          id: reservations.length + 1,
          roomName: 'Sala de teste',
          ...reservation,
        };
        reservations.push(created);
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

test('GET /api/reservations lists reservations and their room names', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    data: [existingReservation],
  });
});

test('POST /api/reservations creates a pending reservation', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 3,
      date: '2026-11-06',
      startTime: '13:00',
      endTime: '14:00',
      responsible: '  Bruno Lima ',
      purpose: '  Aula de reforço ',
    }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    ok: true,
    data: {
      id: 2,
      roomName: 'Sala de teste',
      roomId: 3,
      date: '2026-11-06',
      startTime: '13:00',
      endTime: '14:00',
      responsible: 'Bruno Lima',
      purpose: 'Aula de reforço',
      status: 'pendente',
    },
  });
});

test('POST /api/reservations rejects impossible dates', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 3,
      date: '2026-02-30',
      startTime: '09:00',
      endTime: '10:00',
      responsible: 'Ana Souza',
      purpose: 'Reunião',
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'Informe uma data válida no formato AAAA-MM-DD.',
  });
});

test('POST /api/reservations rejects an end time that is not after the start', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 3,
      date: '2026-11-06',
      startTime: '10:00',
      endTime: '10:00',
      responsible: 'Ana Souza',
      purpose: 'Reunião',
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'O horário de término deve ser posterior ao horário de início.',
  });
});

test('POST /api/reservations rejects unknown statuses', async () => {
  const response = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: 3,
      date: '2026-11-06',
      startTime: '10:00',
      endTime: '11:00',
      responsible: 'Ana Souza',
      purpose: 'Reunião',
      status: 'confirmada',
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    message: 'Situação inválida. Use pendente, aprovada, rejeitada ou cancelada.',
  });
});
