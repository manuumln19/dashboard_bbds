---
target: diseño de Hoy y vistas
total_score: 20
max_score: 36
na_heuristics: 9
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\usuario\\Documents\\Proyecto predeterminado\\src\\components\\HomeView.jsx"
target_fingerprint: "sha256:0c24a42019f8d15e0db35ed99d0601ffd4da87e75d2f0583da10727c24f55751"
target_path: "C:\\Users\\usuario\\Documents\\Proyecto predeterminado\\src\\components\\HomeView.jsx"
timestamp: 2026-11-04T15-52-20Z
slug: src-components-homeview-jsx
---
# Crítica de diseño · Hoy (BBDS)
Método: dos agentes independientes (A: revisión de diseño · B: detector y navegador).

| # | Heurística | Nota | Clave |
|---|---|---|---|
| 1 | Estado del sistema | 3 | Marca «Ahora» y hora de actualización bien; «Guardado en este navegador» es ruido |
| 2 | Mundo real | 3 | Español de casa; jerga en Tiempo (coordenadas) y Energía (PVPC 2.0 TD, IEE) |
| 3 | Control y libertad | 2 | «Reiniciar limpieza» y «Limpiar hechos» como etiquetas normales |
| 4 | Consistencia | 2 | Fraunces para todo; color de persona usado también para lugares |
| 5 | Prevención de errores | 2 | Acciones destructivas junto a las rutinarias |
| 6 | Reconocer, no recordar | 3 | «Lo de siempre» y pasillos; personas como «M» y «P» |
| 7 | Flexibilidad | 2 | Filas de 5–7 controles en Agenda y Energía |
| 8 | Estética y minimalismo | 1 | Hoy: ~12 módulos, datos repetidos, casi todo a 13–19 px |
| 9 | Recuperación de errores | n/a | En la demo no hay estados de error |
| 10 | Ayuda | 2 | «Fuente y cálculo» existe; poca falta en casa |
| **Total** | | **20/36** | **Aceptable (56 %)** |

Veredicto: la piel es bastante genérica (antetítulos «X · Y» en cada vista, serif editorial sobre crema, baldosas pastel, atrezo de almanaque en Tiempo); el producto de debajo no (compra por pasillos, cuentas a medias con comparación, luz barata como acción, pique Manu-Paco, pósits firmados, Yoshi).

Problemas prioritarios:
- [P0] Hoy no se lee a 2–3 m: casi todo a 13–19 px y en gris; texto tenue a 2,1–2,2:1 y un rosa a 2,1:1.
- [P1] Antetítulos y atrezo en todas las vistas.
- [P1] Datos repetidos en Hoy (evento, compra, limpieza dos veces).
- [P2] Color sin significado fijo y Fraunces para todo.
- [P2] Texto que señala en la pared («Falta Paco», «Se quedó atrás») y texto de desarrollador.
