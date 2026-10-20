-- Notas manuscritas en las listas.
-- `drawing` guarda un PNG en data URL (fondo transparente, trazo claro).
ALTER TABLE list_items ADD COLUMN drawing TEXT;
