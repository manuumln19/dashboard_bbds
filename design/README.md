# Estudios de diseño · BBDS

Tres estudios estáticos a **1280 × 800** y un laboratorio tipográfico para explorar la siguiente versión visual del dashboard. Son maquetas aisladas: no son rutas de la app, no se importan desde `src/` y no entran en el build de producción. La app actual sigue intacta.

## C · Almanaque aurora (recomendado)

`almanaque-aurora.html`

La mezcla que conserva la identidad actual y la somete a una estructura más editorial.

**Conserva**

- El rail, el monograma, la navegación y el reloj de la app actual.
- El papel cálido, la aurora fucsia/melocotón/lila/menta y el cristal.
- Manrope para la interfaz y la microtipografía monoespaciada.
- Los iconos dibujados a mano y la paleta de acentos, ahora reducida a puntos y datos en lugar de repetirse en chips.

**Cambia**

- La voz editorial pasa de Newsreader a **Instrument Serif**: más contraste, formas más afiladas y una lectura contemporánea que dialoga mejor con el cristal. La cursiva se reserva para el estado del cielo.
- Una sola ventana de cristal para el tiempo actual, con cuatro medidas y un **arco solar**: amanecer, anochecer y la posición del sol a la hora de observación. Sustituye las dos métricas sueltas de salida/puesta.
- La previsión deja de ser otra tarjeta y pasa a ser una tabla impresa de siete filas: día, cielo, máxima, rango, mínima y lluvia.
- El radar se convierte en una pieza vertical de cristal oscuro, con mapa, barrido, zoom y pausa. Es el contrapeso instrumental de la ventana luminosa.
- La cabecera incorpora un **folio de almanaque**: fecha grande, día del año y semana. Es el detalle de autor que faltaba, sin añadir otra caja.
- Se eliminan las sombras de contacto. La profundidad sale del borde de luz, los reflejos internos, el desenfoque y las tintas de la aurora.

**Por qué**

La aurora y el cristal no desaparecen: se concentran en los dos objetos que de verdad ganan con ellos, la ventana del cielo y el radar. La previsión se lee como un almanaque, no como un dashboard de tarjetas. Instrument Serif aporta una tensión editorial más precisa que Newsreader: no compite con el cristal, lo recorta. El arco solar y el folio dan información y carácter sin recurrir a más tarjetas.

El fondo se pinta con gradientes estáticos y una sola capa de grano, sin grandes blobs animados ni desenfoques de 72 px. Solo la ventana y el radar usan `backdrop-filter`; el barrido del radar es la única animación continua y respeta `prefers-reduced-motion`.

El radar oscuro es una decisión deliberada para dar contraste y peso a la pantalla. Si se prefiere mantener el radar claro de la app actual, se puede invertir sin cambiar la estructura.

**Estado:** pendiente de aprobación. No integrado.

## Laboratorio tipográfico

`type-lab.html`

Compara cuatro sistemas sobre el mismo cristal: Newsreader + Manrope, Instrument Serif + Manrope, Instrument Serif + Manrope light e Instrument Serif como acento sobre Manrope. C usa el segundo; el cuarto es la salida si se prefiere que el serif no domine la pantalla.

## A · Almanaque cálido

`almanaque-calido.html`

Exploración de papel, tipografía grande y estructura editorial. La previsión es una tabla de siete columnas y el radar es una banda horizontal oscura. Es la versión más cálida y tipográfica; pierde parte del cristal y de la aurora actuales.

## B · Instrumento doméstico

`instrumento-domestico.html`

Exploración de precisión, grafito y lectura instrumental. El radar es una esfera y el sol tiene un arco propio. Es la versión más técnica y contrastada; es la que menos conserva la calidez de la app actual.

## Cómo verlas

Abrir cualquiera de los archivos HTML directamente en un navegador. Las fuentes se cargan desde `design/fonts/` y no hay dependencias de red.

No hay que arrancar Vite ni compilar nada para revisar los estudios.

## Tipografías

Copias locales para las maquetas, todas bajo **SIL Open Font License 1.1**:

| Fuente | Estudio | Archivo |
| --- | --- | --- |
| Instrument Serif | C, laboratorio | `fonts/instrument-serif-*.woff2` |
| Newsreader | laboratorio, respaldo de C | `fonts/newsreader-*.woff2` |
| Manrope | C, laboratorio | `fonts/manrope-normal-200-800.woff2` |
| Fraunces | A | `fonts/fraunces-*.woff2` |
| Archivo | A | `fonts/archivo-normal-400-800.woff2` |
| IBM Plex Sans / Mono | A, B, C | `fonts/ibm-plex-*.woff2` |

Los textos de licencia están en `fonts/licenses/`. Las fuentes de producción de la app se cargan desde `node_modules` y no dependen de esta carpeta.

## Alcance

- Los datos de tiempo, radar y galería son de demostración y locales.
- Los controles de los estudios son visuales; no están conectados a la lógica de la app.
- La app mantiene sus rutas, deep links, limpieza semanal, modo noche, galería y clima condicional.
- Cualquier integración posterior debe conservar `VITE_CLIMATE_ENABLED=false` por defecto y el radar como demo local hasta conectar una fuente real.

