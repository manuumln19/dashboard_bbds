-- BBDS · Personas y limpieza compartida
-- Manu y Paco son las dos personas de la casa. Las tareas viven en D1 para
-- que el cuadrante se pueda editar y marcar desde cualquier dispositivo.

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'ink'
    CHECK (tone IN ('pink', 'mint', 'amber', 'lilac', 'ink')),
  initials TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO people (id, name, tone, initials, created_at, updated_at)
VALUES
  ('manu', 'Manu', 'pink', 'M', datetime('now'), datetime('now')),
  ('paco', 'Paco', 'mint', 'P', datetime('now'), datetime('now'));

CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id TEXT PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  person_id TEXT NOT NULL,
  area TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_day
  ON cleaning_tasks (active, day_of_week, position, id);

CREATE TABLE IF NOT EXISTS cleaning_checks (
  week_key TEXT NOT NULL,
  task_id TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (week_key, task_id)
);

CREATE INDEX IF NOT EXISTS idx_cleaning_checks_week
  ON cleaning_checks (week_key, done);

-- Cuadrante de la casa: dos tareas al día, una para cada uno.
INSERT OR IGNORE INTO cleaning_tasks
  (id, day_of_week, person_id, area, title, position, active, created_at, updated_at)
VALUES
  ('mon-cocina',   0, 'manu', 'Cocina',      'Encimera y vitro',     0, 1, datetime('now'), datetime('now')),
  ('mon-salon',    0, 'paco', 'Salón',       'Aspirar y ordenar',    1, 1, datetime('now'), datetime('now')),
  ('tue-bano',     1, 'paco', 'Baño',        'Baño principal',       0, 1, datetime('now'), datetime('now')),
  ('tue-entrada',  1, 'manu', 'Entrada',     'Zapatos y paraguas',   1, 1, datetime('now'), datetime('now')),
  ('wed-cocina',   2, 'manu', 'Cocina',      'Fregadero y vitro',    0, 1, datetime('now'), datetime('now')),
  ('wed-dormir',   2, 'paco', 'Dormitorio',  'Cambiar sábanas',      1, 1, datetime('now'), datetime('now')),
  ('thu-salon',    3, 'paco', 'Salón',       'Polvo y cojines',      0, 1, datetime('now'), datetime('now')),
  ('thu-comedor',  3, 'manu', 'Comedor',     'Mesa y cristalera',    1, 1, datetime('now'), datetime('now')),
  ('fri-bano',     4, 'manu', 'Baño',        'Baño pequeño',         0, 1, datetime('now'), datetime('now')),
  ('fri-cocina',   4, 'paco', 'Cocina',      'Nevera y despensa',    1, 1, datetime('now'), datetime('now')),
  ('sat-terraza',  5, 'paco', 'Terraza',     'Barrer y ordenar',     0, 1, datetime('now'), datetime('now')),
  ('sat-colada',   5, 'manu', 'Colada',      'Lavadora y tender',    1, 1, datetime('now'), datetime('now')),
  ('sun-pasillo',  6, 'manu', 'Pasillo',     'Repaso y espejos',     0, 1, datetime('now'), datetime('now')),
  ('sun-salon',    6, 'paco', 'Salón',       'Manta y sofá',         1, 1, datetime('now'), datetime('now'));
