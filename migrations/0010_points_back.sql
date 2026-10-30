-- BBDS · Vuelta a la escala de 5, 10 y 20, ahora con 2,5
-- La 0009 pasó los puntos a 1, 2, 3 o 5; se vuelve a la de antes (×5) y se
-- añade 2,5 para lo pequeño (bajar la basura). `done_at` se queda.
-- La columna es INTEGER, pero SQLite guarda 2.5 tal cual (como REAL).

-- 1 → 5, 2 → 10, 3 → 10 (no hay 15), 5 → 20.
UPDATE cleaning_tasks SET points = CASE points WHEN 1 THEN 5 WHEN 5 THEN 20 ELSE 10 END;

UPDATE list_items SET points = CASE points WHEN 1 THEN 5 WHEN 5 THEN 20 ELSE 10 END
  WHERE points IS NOT NULL;

-- Puntos a mano: de 1 en 1 a de 5 en 5 (−1 → −5, +4 → +20).
UPDATE point_events SET points = MAX(-20, MIN(50, points * 5));
