const { pool } = require('../database/pool');

async function list({ minimumCapacity, resourceIds = [] } = {}) {
  const conditions = [];
  const values = [];

  if (minimumCapacity !== undefined) {
    conditions.push('salas.capacidade >= ?');
    values.push(minimumCapacity);
  }

  if (resourceIds.length > 0) {
    const placeholders = resourceIds.map(() => '?').join(', ');
    conditions.push(`salas.id IN (
      SELECT sala_id
      FROM sala_recursos
      WHERE recurso_id IN (${placeholders})
    )`);
    values.push(...resourceIds);
  }

  const filters = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(`
    SELECT
      salas.id,
      salas.nome AS name,
      salas.andar AS floor,
      salas.capacidade AS capacity,
      recursos.nome AS resource
    FROM salas
    LEFT JOIN sala_recursos ON sala_recursos.sala_id = salas.id
    LEFT JOIN recursos ON recursos.id = sala_recursos.recurso_id
    ${filters}
    ORDER BY salas.nome, recursos.nome
  `, values);

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
      'INSERT INTO salas (nome, andar, capacidade) VALUES (?, ?, ?)',
      [room.name, room.floor, room.capacity],
    );
    const storedResources = [];

    for (const resource of room.resources) {
      await connection.execute(
        'INSERT INTO recursos (nome) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
        [resource],
      );
      const [[resourceRow]] = await connection.execute(
        'SELECT id, nome AS name FROM recursos WHERE id = LAST_INSERT_ID()',
      );
      await connection.execute(
        'INSERT INTO sala_recursos (sala_id, recurso_id) VALUES (?, ?)',
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
