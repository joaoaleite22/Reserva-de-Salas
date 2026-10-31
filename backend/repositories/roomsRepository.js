const { pool } = require('../database/pool');

async function list() {
  const [rows] = await pool.query(`
    SELECT
      rooms.id,
      rooms.name,
      rooms.floor,
      rooms.capacity,
      resources.name AS resource
    FROM rooms
    LEFT JOIN room_resources ON room_resources.room_id = rooms.id
    LEFT JOIN resources ON resources.id = room_resources.resource_id
    ORDER BY rooms.name, resources.name
  `);

  const rooms = new Map();

  for (const row of rows) {
    if (!rooms.has(row.id)) {
      rooms.set(row.id, {
        id: row.id,
        name: row.name,
        floor: row.floor,
        capacity: row.capacity,
        resources: [],
      });
    }

    if (row.resource) {
      rooms.get(row.id).resources.push(row.resource);
    }
  }

  return [...rooms.values()];
}

async function create(room) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [roomResult] = await connection.execute(
      'INSERT INTO rooms (name, floor, capacity) VALUES (?, ?, ?)',
      [room.name, room.floor, room.capacity],
    );
    const storedResources = [];

    for (const resource of room.resources) {
      await connection.execute(
        'INSERT INTO resources (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
        [resource],
      );
      const [[resourceRow]] = await connection.execute(
        'SELECT id, name FROM resources WHERE id = LAST_INSERT_ID()',
      );
      await connection.execute(
        'INSERT INTO room_resources (room_id, resource_id) VALUES (?, ?)',
        [roomResult.insertId, resourceRow.id],
      );
      storedResources.push(resourceRow.name);
    }

    await connection.commit();

    return {
      id: roomResult.insertId,
      ...room,
      resources: storedResources,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { create, list };
