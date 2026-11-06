ALTER TABLE reservas
  ADD COLUMN quantidade_alunos SMALLINT UNSIGNED NOT NULL DEFAULT 1
    AFTER sala_id,
  ADD CONSTRAINT chk_reservas_quantidade_alunos
    CHECK (quantidade_alunos > 0);
