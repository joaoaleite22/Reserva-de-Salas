CREATE TABLE IF NOT EXISTS salas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  andar VARCHAR(60) NOT NULL,
  capacidade SMALLINT UNSIGNED NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_salas_andar (andar),
  CONSTRAINT chk_salas_capacidade_positiva CHECK (capacidade > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS recursos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recursos_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sala_recursos (
  sala_id INT UNSIGNED NOT NULL,
  recurso_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (sala_id, recurso_id),
  CONSTRAINT fk_sala_recursos_sala
    FOREIGN KEY (sala_id) REFERENCES salas (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sala_recursos_recurso
    FOREIGN KEY (recurso_id) REFERENCES recursos (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  senha_hash VARCHAR(60) NOT NULL,
  perfil ENUM('professor', 'gerente') NOT NULL DEFAULT 'professor',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reservas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sala_id INT UNSIGNED NOT NULL,
  quantidade_alunos SMALLINT UNSIGNED NOT NULL,
  data_reserva DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  responsavel VARCHAR(120) NOT NULL,
  finalidade VARCHAR(500) NOT NULL,
  situacao ENUM('pendente', 'aprovada', 'rejeitada', 'cancelada')
    NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_reservas_sala_horario (sala_id, data_reserva, hora_inicio, hora_fim),
  INDEX idx_reservas_situacao (situacao),
  CONSTRAINT fk_reservas_sala
    FOREIGN KEY (sala_id) REFERENCES salas (id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_reservas_quantidade_alunos CHECK (quantidade_alunos > 0),
  CONSTRAINT chk_reservas_horario_valido CHECK (hora_fim > hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
