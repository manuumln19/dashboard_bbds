-- BBDS · Varios calendarios ICS
-- Cada feed puede ser de una persona o de la casa. La URL es la dirección
-- secreta de iCal (no el enlace público de compartir).

CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'lilac'
    CHECK (color IN ('pink', 'mint', 'amber', 'lilac', 'ink')),
  person_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendars_url
  ON calendars (url);

CREATE INDEX IF NOT EXISTS idx_calendars_active
  ON calendars (active, name);

-- Marca de inicialización: si alguien borra todos los calendarios, el feed
-- de ICLOUD_ICS_URL no reaparece en cada petición.
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
