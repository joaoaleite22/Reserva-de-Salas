RENAME TABLE
  rooms TO salas,
  resources TO recursos,
  room_resources TO sala_recursos,
  reservations TO reservas;

ALTER TABLE salas
  RENAME COLUMN name TO nome,
  RENAME COLUMN floor TO andar,
  RENAME COLUMN capacity TO capacidade,
  RENAME COLUMN created_at TO criado_em,
  RENAME COLUMN updated_at TO atualizado_em,
  RENAME INDEX idx_rooms_floor TO idx_salas_andar,
  DROP CHECK chk_rooms_capacity_positive,
  ADD CONSTRAINT chk_salas_capacidade_positiva CHECK (capacidade > 0);

ALTER TABLE recursos
  RENAME COLUMN name TO nome,
  RENAME INDEX uq_resources_name TO uq_recursos_nome;

ALTER TABLE sala_recursos
  DROP FOREIGN KEY fk_room_resources_room,
  DROP FOREIGN KEY fk_room_resources_resource,
  RENAME COLUMN room_id TO sala_id,
  RENAME COLUMN resource_id TO recurso_id,
  ADD CONSTRAINT fk_sala_recursos_sala
    FOREIGN KEY (sala_id) REFERENCES salas (id)
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_sala_recursos_recurso
    FOREIGN KEY (recurso_id) REFERENCES recursos (id)
    ON DELETE CASCADE;

ALTER TABLE reservas
  DROP FOREIGN KEY fk_reservations_room,
  DROP CHECK chk_reservations_time_order,
  RENAME COLUMN room_id TO sala_id,
  RENAME COLUMN reservation_date TO data_reserva,
  RENAME COLUMN start_time TO hora_inicio,
  RENAME COLUMN end_time TO hora_fim,
  RENAME COLUMN responsible TO responsavel,
  RENAME COLUMN purpose TO finalidade,
  RENAME COLUMN status TO situacao,
  RENAME COLUMN created_at TO criado_em,
  RENAME COLUMN updated_at TO atualizado_em,
  RENAME INDEX idx_reservations_room_schedule TO idx_reservas_sala_horario,
  RENAME INDEX idx_reservations_status TO idx_reservas_situacao,
  ADD CONSTRAINT fk_reservas_sala
    FOREIGN KEY (sala_id) REFERENCES salas (id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT chk_reservas_horario_valido CHECK (hora_fim > hora_inicio);
