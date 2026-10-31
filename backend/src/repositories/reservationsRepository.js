const { pool } = require('../database/pool');

async function list() {
  const [rows] = await pool.query(`
    SELECT
      reservations.id,
      reservations.room_id AS roomId,
      rooms.name AS roomName,
      DATE_FORMAT(reservations.reservation_date, '%Y-%m-%d') AS date,
      TIME_FORMAT(reservations.start_time, '%H:%i') AS startTime,
      TIME_FORMAT(reservations.end_time, '%H:%i') AS endTime,
      reservations.responsible,
      reservations.purpose,
      reservations.status
    FROM reservations
    INNER JOIN rooms ON rooms.id = reservations.room_id
    ORDER BY reservations.reservation_date, reservations.start_time
  `);

  return rows;
}

async function create(reservation) {
  const [result] = await pool.execute(
    `INSERT INTO reservations (
      room_id,
      reservation_date,
      start_time,
      end_time,
      responsible,
      purpose,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      reservation.roomId,
      reservation.date,
      reservation.startTime,
      reservation.endTime,
      reservation.responsible,
      reservation.purpose,
      reservation.status,
    ],
  );

  const [rows] = await pool.execute(
    `SELECT
      reservations.id,
      reservations.room_id AS roomId,
      rooms.name AS roomName,
      DATE_FORMAT(reservations.reservation_date, '%Y-%m-%d') AS date,
      TIME_FORMAT(reservations.start_time, '%H:%i') AS startTime,
      TIME_FORMAT(reservations.end_time, '%H:%i') AS endTime,
      reservations.responsible,
      reservations.purpose,
      reservations.status
    FROM reservations
    INNER JOIN rooms ON rooms.id = reservations.room_id
    WHERE reservations.id = ?`,
    [result.insertId],
  );

  return rows[0];
}

module.exports = { create, list };
