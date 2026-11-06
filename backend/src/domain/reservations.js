const activeReservationStatuses = new Set(['pendente', 'aprovada']);

class ReservationConflictError extends Error {
  constructor() {
    super('A sala já possui uma reserva pendente ou aprovada nesse horário.');
    this.name = 'ReservationConflictError';
    this.code = 'RESERVATION_CONFLICT';
  }
}

class RoomCapacityExceededError extends Error {
  constructor() {
    super('A quantidade de alunos excede a capacidade da sala selecionada.');
    this.name = 'RoomCapacityExceededError';
    this.code = 'ROOM_CAPACITY_EXCEEDED';
  }
}

function assertRoomCapacity(roomCapacity, studentCount) {
  if (studentCount > roomCapacity) {
    throw new RoomCapacityExceededError();
  }
}

function hasScheduleConflict(reservations, candidate) {
  return reservations.some((reservation) => (
    reservation.roomId === candidate.roomId
    && reservation.date === candidate.date
    && activeReservationStatuses.has(reservation.status)
    && reservation.startTime < candidate.endTime
    && reservation.endTime > candidate.startTime
  ));
}

module.exports = {
  assertRoomCapacity,
  hasScheduleConflict,
  ReservationConflictError,
  RoomCapacityExceededError,
};
