-- BBDS · Pósits que avisan
-- remind_at: cuándo debe avisar (ISO). La pantalla lo destaca a esa hora y
--   Yoshi lo dice; al tocar «Visto» desaparece como siempre.
-- for_person: para quién es («Para Paco»); null es para la casa.
-- expires_at: cuándo se quita solo (ISO); null es «hasta que alguien lo vea».

ALTER TABLE notes ADD COLUMN remind_at TEXT;
ALTER TABLE notes ADD COLUMN for_person TEXT;
ALTER TABLE notes ADD COLUMN expires_at TEXT;
