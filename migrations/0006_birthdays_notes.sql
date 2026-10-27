-- BBDS · Cumpleaños y notas de nevera
-- `birthday` es MM-DD: basta para felicitar, no hace falta el año.
-- Los días de limpieza se guardan en app_meta ('cleaning.days').

ALTER TABLE people ADD COLUMN birthday TEXT;

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 160),
  person_id TEXT,
  color TEXT NOT NULL DEFAULT 'amber'
    CHECK (color IN ('pink', 'mint', 'amber', 'lilac')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_created
  ON notes (created_at DESC);
