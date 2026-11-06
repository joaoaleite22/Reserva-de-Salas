const { pool } = require('../database/pool');
const {
  assertRoomCapacity,
  hasScheduleConflict,
  ReservationConflictError,
} = require('../domain/reservations');

async function list() {
  const [rows] = await pool.query(`
    SELECT
      reservas.id,
      reservas.sala_id AS roomId,
      salas.nome AS roomName,
      reservas.quantidade_alunos AS studentCount,
      DATE_FORMAT(reservas.data_reserva, '%Y-%m-%d') AS date,
      TIME_FORMAT(reservas.hora_inicio, '%H:%i') AS startTime,
      TIME_FORMAT(reservas.hora_fim, '%H:%i') AS endTime,
      reservas.responsavel AS responsible,
      reservas.finalidade AS purpose,
      reservas.situacao AS status
    FROM reservas
    INNER JOIN salas ON salas.id = reservas.sala_id
    ORDER BY reservas.data_reserva, reservas.hora_inicio
  `);

  return rows;
}

async function create(reservation) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [roomRows] = await connection.execute(
      'SELECT id, capacidade FROM salas WHERE id = ? FOR UPDATE',
      [reservation.roomId],
    );

    if (roomRows.length === 0) {
      const error = new Error('A sala informada não foi encontrada.');
      error.code = 'ROOM_NOT_FOUND';
      throw error;
    }

    assertRoomCapacity(roomRows[0].capacidade, reservation.studentCount);

    const resourcePlaceholders = reservation.requiredResourceIds.map(() => '?').join(', ');
    const [resourceRows] = await connection.execute(
      `SELECT COUNT(*) AS matchingResources
      FROM sala_recursos
      WHERE sala_id = ?
        AND recurso_id IN (${resourcePlaceholders})`,
      [reservation.roomId, ...reservation.requiredResourceIds],
    );

    if (resourceRows[0].matchingResources === 0) {
      const error = new Error(
        'A sala selecionada não possui nenhum dos recursos solicitados.',
      );
      error.code = 'ROOM_RESOURCE_MISMATCH';
      throw error;
    }

    const [existingReservations] = await connection.execute(
      `SELECT
        sala_id AS roomId,
        DATE_FORMAT(data_reserva, '%Y-%m-%d') AS date,
        TIME_FORMAT(hora_inicio, '%H:%i') AS startTime,
        TIME_FORMAT(hora_fim, '%H:%i') AS endTime,
        situacao AS status
      FROM reservas
      WHERE sala_id = ?
        AND data_reserva = ?
        AND situacao IN ('pendente', 'aprovada')
      FOR UPDATE`,
      [reservation.roomId, reservation.date],
    );

    if (hasScheduleConflict(existingReservations, reservation)) {
      throw new ReservationConflictError();
    }

    const [result] = await connection.execute(
      `INSERT INTO reservas (
        sala_id,
        quantidade_alunos,
        data_reserva,
        hora_inicio,
        hora_fim,
        responsavel,
        finalidade,
        situacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservation.roomId,
        reservation.studentCount,
        reservation.date,
        reservation.startTime,
        reservation.endTime,
        reservation.responsible,
        reservation.purpose,
        reservation.status,
      ],
    );

    const [rows] = await connection.execute(
      `SELECT
        reservas.id,
        reservas.sala_id AS roomId,
        salas.nome AS roomName,
        reservas.quantidade_alunos AS studentCount,
        DATE_FORMAT(reservas.data_reserva, '%Y-%m-%d') AS date,
        TIME_FORMAT(reservas.hora_inicio, '%H:%i') AS startTime,
        TIME_FORMAT(reservas.hora_fim, '%H:%i') AS endTime,
        reservas.responsavel AS responsible,
        reservas.finalidade AS purpose,
        reservas.situacao AS status
      FROM reservas
      INNER JOIN salas ON salas.id = reservas.sala_id
      WHERE reservas.id = ?`,
      [result.insertId],
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { create, list };
