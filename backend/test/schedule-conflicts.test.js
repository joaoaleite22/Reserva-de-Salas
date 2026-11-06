const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');
const {
  assertRoomCapacity,
  hasScheduleConflict,
  ReservationConflictError,
} = require('../src/domain/reservations');

const roomId = 1;

function createInMemoryReservationsRepository() {
  const reservations = [];

  return {
    async list() {
      return reservations;
    },
    async create(reservation) {
      if (hasScheduleConflict(reservations, reservation)) {
        throw new ReservationConflictError();
      }

      const created = {
        id: reservations.length + 1,
        roomName: 'Sala de teste',
        ...reservation,
      };
      reservations.push(created);
      return created;
    },
  };
}

let server;
let baseUrl;
let reservationsRepository;

before(async () => {
  reservationsRepository = createInMemoryReservationsRepository();
  const app = createApp({
    roomsRepository: {
      async list() { return []; },
      async create(room) { return room; },
    },
    reservationsRepository,
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

async function reserve(date, startTime, endTime, reservationRoomId = roomId) {
  return fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId: reservationRoomId,
      studentCount: 10,
      requiredResourceIds: [1],
      date,
      startTime,
      endTime,
      responsible: 'Teste de conflitos',
      purpose: 'Verificação de disponibilidade',
    }),
  });
}

test('rejects overlapping reservations: 19:00-21:00 and 20:00-22:00', async () => {
  const first = await reserve('2026-11-07', '19:00', '21:00');
  const second = await reserve('2026-11-07', '20:00', '22:00');

  assert.equal(first.status, 201);
  assert.equal(second.status, 409);
  assert.deepEqual(await second.json(), {
    ok: false,
    message: 'A sala já possui uma reserva pendente ou aprovada nesse horário.',
  });
});

test('allows consecutive reservations: 19:00-20:00 and 20:00-21:00', async () => {
  const first = await reserve('2026-11-08', '19:00', '20:00');
  const second = await reserve('2026-11-08', '20:00', '21:00');

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
});

test('rejects an overlapping reservation inside a longer reservation', async () => {
  const first = await reserve('2026-11-09', '19:00', '22:00');
  const second = await reserve('2026-11-09', '20:00', '21:00');

  assert.equal(first.status, 201);
  assert.equal(second.status, 409);
});

test('allows reservations on the same day when times do not overlap', async () => {
  const first = await reserve('2026-11-10', '08:00', '10:00');
  const second = await reserve('2026-11-10', '19:00', '21:00');

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
});

test('allows overlapping reservations at the same time in different rooms', async () => {
  const first = await reserve('2026-11-12', '19:00', '21:00', 1);
  const second = await reserve('2026-11-12', '19:00', '21:00', 2);

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
});

test('allows overlapping reservations in the same room on different dates', async () => {
  const first = await reserve('2026-11-13', '19:00', '21:00');
  const second = await reserve('2026-11-14', '19:00', '21:00');

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
});

test('cancelled and rejected reservations do not block a time slot', () => {
  for (const status of ['cancelada', 'rejeitada']) {
    assert.equal(
      hasScheduleConflict(
        [{
          roomId,
          date: '2026-11-11',
          startTime: '19:00',
          endTime: '21:00',
          status,
        }],
        {
          roomId,
          date: '2026-11-11',
          startTime: '20:00',
          endTime: '22:00',
        },
      ),
      false,
      `${status} reservations should release the room`,
    );
  }

  for (const status of ['pendente', 'aprovada']) {
    assert.equal(
      hasScheduleConflict(
        [{
          roomId,
          date: '2026-11-11',
          startTime: '19:00',
          endTime: '21:00',
          status,
        }],
        {
          roomId,
          date: '2026-11-11',
          startTime: '20:00',
          endTime: '22:00',
        },
      ),
      true,
      `${status} reservations should block the room`,
    );
  }
});

test('allows an enrollment equal to room capacity', () => {
  assert.doesNotThrow(() => assertRoomCapacity(30, 30));
});
