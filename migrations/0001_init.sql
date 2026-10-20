-- BBDS · Fase 1
-- Ejecuta: npm run db:migrate:local  /  npm run db:migrate

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  temperature REAL NOT NULL,
  humidity REAL NOT NULL,
  pressure REAL,
  battery REAL,
  recorded_at TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_readings_room_time
  ON readings (room_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_readings_time
  ON readings (recorded_at);

CREATE TABLE IF NOT EXISTS list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id TEXT NOT NULL CHECK (list_id IN ('shopping', 'tasks')),
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_list_items_list
  ON list_items (list_id, done, created_at);
