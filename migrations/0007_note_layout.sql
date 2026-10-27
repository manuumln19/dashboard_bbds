-- BBDS · Corcho de notas
-- Cada pósit guarda dónde está y cómo es: x/y en fracción del corcho (0–1),
-- ancho y alto en píxeles de la pantalla de referencia (1280 x 800), un giro
-- pequeño en grados y la forma. Sin posición (NULL), el cliente lo coloca.

ALTER TABLE notes ADD COLUMN x REAL;
ALTER TABLE notes ADD COLUMN y REAL;
ALTER TABLE notes ADD COLUMN w INTEGER;
ALTER TABLE notes ADD COLUMN h INTEGER;
ALTER TABLE notes ADD COLUMN rot REAL NOT NULL DEFAULT 0;
ALTER TABLE notes ADD COLUMN shape TEXT NOT NULL DEFAULT 'square';
