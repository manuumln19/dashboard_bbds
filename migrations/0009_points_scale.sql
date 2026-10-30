-- BBDS · Escala pequeña de puntos y cuándo se hizo cada tarea
-- Los puntos pasan a 1 (bajar la basura), 2 (fregar), 3 (sábanas) o 5 (el
-- horno): bajar la basura no vale lo mismo que medio baño. Lo ya guardado con
-- la escala anterior (5, 10, 20) se convierte. `done_at` es cuándo se hizo una
-- tarea suelta, para contarla en su semana aunque luego se edite.

-- Rutina: el 10 de antes es el 2 de ahora (el Worker siempre escribe el valor;
-- el DEFAULT 10 de la columna ya no se usa).
-- Corre una sola vez, así que todo valor es de la escala vieja (5, 10, 20).
UPDATE cleaning_tasks SET points = CASE points WHEN 5 THEN 1 WHEN 20 THEN 5 ELSE 2 END;

UPDATE list_items SET points = CASE points WHEN 5 THEN 1 WHEN 10 THEN 2 WHEN 20 THEN 5 ELSE 2 END
  WHERE points IS NOT NULL;

-- Puntos a mano: de 5 en 5 a de 1 en 1 (−5 → −1, +20 → +4); lo que no sea
-- múltiplo de 5 se divide igual, y lo menor que 5 queda en ±1.
UPDATE point_events SET points = CASE WHEN points / 5 = 0 THEN (CASE WHEN points < 0 THEN -1 ELSE 1 END) ELSE points / 5 END;

ALTER TABLE list_items ADD COLUMN done_at TEXT;

-- Lo que ya estaba hecho: su última edición es lo más parecido a cuándo.
UPDATE list_items SET done_at = updated_at WHERE done = 1;
