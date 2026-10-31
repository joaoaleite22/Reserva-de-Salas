const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createApp } = require('../src/app');

const rooms = [
  { id: 1, name: 'Sala A', floor: 'Térreo', capacity: 30, resources: ['Projetor'] },
  { id: 2, name: 'Laboratório B', floor: '1º andar', capacity: 24, resources: ['Computadores'] },
  { id: 3, name: 'Auditório', floor: '2º andar', capacity: 100, resources: ['Microfone', 'Projetor'] },
];

const reservations = [
  {
    id: 1,
    roomId: 1,
    roomName: 'Sala A',
    date: '2026-11-02',
    startTime: '09:00',
    endTime: '10:00',
    responsible: 'Ana Souza',
    purpose: 'Reunião pedagógica',
    status: 'pendente',
  },
  {
    id: 2,
    roomId: 1,
    roomName: 'Sala A',
    date: '2026-11-02',
    startTime: '10:00',
    endTime: '11:00',
    responsible: 'Bruno Lima',
    purpose: 'Atendimento aos alunos',
    status: 'aprovada',
  },
  {
    id: 3,
    roomId: 2,
    roomName: 'Laboratório B',
    date: '2026-11-03',
    startTime: '13:00',
    endTime: '14:30',
    responsible: 'Carla Mendes',
    purpose: 'Aula de informática',
    status: 'aprovada',
  },
  {
    id: 4,
    roomId: 3,
    roomName: 'Auditório',
    date: '2026-11-04',
    startTime: '18:00',
    endTime: '20:00',
    responsible: 'Diego Alves',
    purpose: 'Palestra de orientação profissional',
    status: 'rejeitada',
  },
  {
    id: 5,
    roomId: 2,
    roomName: 'Laboratório B',
    date: '2026-11-05',
    startTime: '08:00',
    endTime: '09:30',
    responsible: 'Elisa Rocha',
    purpose: 'Oficina de programação',
    status: 'cancelada',
  },
];

let server;
let baseUrl;

before(async () => {
  const app = createApp({
    roomsRepository: {
      async list() {
        return rooms;
      },
      async create(room) {
        return room;
      },
    },
    reservationsRepository: {
      async list() {
        return reservations;
      },
      async create(reservation) {
        return reservation;
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

test('API returns at least three rooms and five reservations linked to those rooms', async () => {
  const [roomsResponse, reservationsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/rooms`),
    fetch(`${baseUrl}/api/reservations`),
  ]);
  const roomsResult = await roomsResponse.json();
  const reservationsResult = await reservationsResponse.json();

  assert.equal(roomsResponse.status, 200);
  assert.equal(reservationsResponse.status, 200);
  assert.ok(roomsResult.data.length >= 3);
  assert.ok(reservationsResult.data.length >= 5);

  const roomsById = new Map(roomsResult.data.map((room) => [room.id, room]));
  for (const reservation of reservationsResult.data) {
    const room = roomsById.get(reservation.roomId);
    assert.ok(room, `reservation ${reservation.id} points to an existing room`);
    assert.equal(reservation.roomName, room.name);
  }
});
