-- BBDS · Recompensas canjeadas con los puntos de la semana
-- «Elijo la peli», «Hoy no friego»… Se guarda el nombre y lo que costó en el
-- momento de canjear, así cambiar el catálogo (src/lib/rewards.js) no toca lo
-- ya canjeado. El saldo se calcula en la app: puntos de la semana menos lo
-- canjeado esa semana; canjear no baja el marcador.

CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  reward TEXT NOT NULL CHECK (length(reward) BETWEEN 1 AND 60),
  cost REAL NOT NULL CHECK (cost > 0 AND cost <= 200),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_redemptions_created
  ON redemptions (created_at DESC);
