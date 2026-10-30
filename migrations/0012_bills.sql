-- BBDS · Cuentas: alquiler y facturas de casa, a medias
-- Cada factura (luz, agua, basura…) es de un mes (`period`, YYYY-MM) y cada
-- persona marca su parte como pagada en `bill_payments`. El alquiler es una
-- regla (`bill_rules`): el Worker crea su factura de cada mes al leerlas, una
-- sola vez por mes gracias al índice único.

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('alquiler', 'luz', 'agua', 'basura', 'gas', 'internet', 'comunidad', 'otro')),
  title TEXT CHECK (title IS NULL OR length(title) <= 60),
  period TEXT NOT NULL CHECK (length(period) = 7),
  amount REAL NOT NULL CHECK (amount > 0 AND amount <= 100000),
  due_on TEXT,
  rule_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bills_period ON bills (period DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_rule_period ON bills (rule_id, period) WHERE rule_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bill_payments (
  bill_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  paid_at TEXT NOT NULL,
  PRIMARY KEY (bill_id, person_id)
);

CREATE TABLE IF NOT EXISTS bill_rules (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT CHECK (title IS NULL OR length(title) <= 60),
  amount REAL NOT NULL CHECK (amount > 0 AND amount <= 100000),
  day_from INTEGER NOT NULL DEFAULT 1 CHECK (day_from BETWEEN 1 AND 28),
  day_to INTEGER NOT NULL DEFAULT 5 CHECK (day_to BETWEEN 1 AND 28),
  active INTEGER NOT NULL DEFAULT 1
);
