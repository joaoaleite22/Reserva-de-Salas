CREATE TABLE IF NOT EXISTS rooms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  floor VARCHAR(60) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_rooms_floor (floor),
  CONSTRAINT chk_rooms_capacity_positive CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS resources (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_resources_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS room_resources (
  room_id INT UNSIGNED NOT NULL,
  resource_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (room_id, resource_id),
  CONSTRAINT fk_room_resources_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_room_resources_resource
    FOREIGN KEY (resource_id) REFERENCES resources (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id INT UNSIGNED NOT NULL,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  responsible VARCHAR(120) NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  status ENUM('pendente', 'aprovada', 'rejeitada', 'cancelada')
    NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_reservations_room_schedule (room_id, reservation_date, start_time, end_time),
  INDEX idx_reservations_status (status),
  CONSTRAINT fk_reservations_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_reservations_time_order CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
