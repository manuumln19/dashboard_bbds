-- BBDS · Tareas con fecha, hora y persona
-- Las tareas de la lista `tasks` pueden ser de un día concreto (due_on),
-- a una hora concreta (due_at) o de cualquiera de los dos.

ALTER TABLE list_items ADD COLUMN due_on TEXT;
ALTER TABLE list_items ADD COLUMN due_at TEXT;
ALTER TABLE list_items ADD COLUMN person_id TEXT;

CREATE INDEX IF NOT EXISTS idx_list_items_due
  ON list_items (list_id, done, due_on, due_at);
