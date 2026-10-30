-- BBDS · Puntos por tarea, tareas libres y puntos a mano
-- Cada tarea vale lo que cuesta: la limpieza (rutina semanal) y las tareas
-- sueltas guardan sus puntos. Una tarea suelta sin persona es «libre» y se la
-- lleva quien la haga (`done_by`). Los puntos a mano son lo que no estaba
-- apuntado («hizo la cena»). Solo añade: lo que ya hay sigue igual.

ALTER TABLE cleaning_tasks ADD COLUMN points INTEGER NOT NULL DEFAULT 10;

ALTER TABLE list_items ADD COLUMN points INTEGER;
ALTER TABLE list_items ADD COLUMN done_by TEXT;

CREATE TABLE IF NOT EXISTS point_events (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points BETWEEN -20 AND 50),
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 60),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_point_events_created
  ON point_events (created_at DESC);
