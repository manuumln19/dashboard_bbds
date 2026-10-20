# BBDS

Dashboard doméstico editorial para una pantalla táctil de pared. Papel, tinta y cristal suave: reloj, tiempo exterior con radar, agenda de iCloud, compra, tareas, limpieza semanal, clima interior opcional, galería de fotos y modo noche.

Pensado para **1280 × 800** en horizontal. En pantallas más estrechas el rail y las tarjetas se adaptan, pero esa es la medida de referencia.

## Qué incluye

- **Hoy**: reloj y fecha grandes, tiempo actual con previsión por horas, próximo evento con cuenta atrás, agenda de los próximos días y resumen de compra y tareas. Inicio no muestra clima interior.
- **Agenda**: calendario de iCloud de solo lectura con vistas **Hoy**, **3 días** y **Semana**. Eventos con color por tipo, marca de la hora actual, eventos de todo el día y ficha de detalle. No se edita nada desde el dashboard.
- **Listas**: compra y tareas con contadores grandes, progreso y entrada rápida siempre visible. El texto es el flujo principal; la libreta manuscrita con OCR local queda como acción secundaria.
- **Limpieza**: cuadrante de lunes a domingo, dos tareas por día, persona y zona asignadas. Cada tarea se marca tocando la tarjeta; el progreso se guarda en el navegador y se reinicia solo al empezar una semana nueva.
- **Tiempo**: temperatura exterior, sensación térmica, icono del cielo, humedad, viento, lluvia, UV, salida y puesta de sol, previsión de siete días y radar de lluvia local con zoom y pausa. El radar actual es una animación ilustrativa local, pensada como base para conectar una fuente real más adelante.
- **Casa**: temperatura y humedad por habitación, histórico de 24 h y 7 días, tendencia, riesgo de moho, batería/presión del sensor y consejos de ventilación. Solo aparece con `VITE_CLIMATE_ENABLED=true`.
- **Galería**: salvapantallas de fotos tras unos minutos sin actividad y botón de apertura manual en el rail. Las fotos son locales; se puede volver tocando la pantalla, con `Esc` o con las flechas.
- **Modo noche**: variante de tinta oscura del mismo diseño, automática por horario y con atenuación manual temporal.
- **Deep links**: `#home`, `#agenda`, `#lists`, `#cleaning`, `#weather` y, con clima activado, `#climate`.
- **Demo navegable** sin backend (`npm run dev:demo`).

## Arranque rápido

Requisitos: Node 22.12 o superior y npm.

```bash
npm install
npm run dev:demo
```

Abre `http://127.0.0.1:5173`. En modo demo los datos son de ejemplo: las listas y la limpieza se guardan en local y el tiempo se genera localmente; el calendario y los sensores no necesitan Worker. El tiempo de demo no hace peticiones a Open-Meteo, y el radar y las fotos de la galería son recursos locales.

### Demo con datos reales del Worker

Necesitas dos terminales:

```bash
# Terminal 1: Worker + D1 local + assets de dist
npm run db:migrate:local
npm run build
npm run api

# Terminal 2: Vite y proxy /api -> 127.0.0.1:8787
npm run dev
```

El frontend de desarrollo estará en `http://127.0.0.1:5173` y la API en `http://127.0.0.1:8787/api`.

> `wrangler dev` sirve los assets de `dist`, por eso hay que compilar antes de arrancarlo. Si solo estás tocando React, el build no es necesario para el HMR; el Worker y Vite son procesos independientes.

## Escribir listas con el dedo

En **Listas**, cada tarjeta tiene un botón de lápiz junto al campo de texto.

1. Toca el lápiz.
2. Escribe una línea con el dedo, un lápiz o el ratón. Puedes cambiar el color de tinta, deshacer o borrar.
3. Pulsa **Reconocer texto**. La primera vez se descarga el modelo (unos 70 MB); después queda en la caché del navegador y no vuelve a descargarse.
4. Revisa el texto detectado, corrige tildes, ñ o palabras, y pulsa **Añadir a la lista**.

El reconocimiento se ejecuta en el propio dispositivo con [Transformers.js](https://huggingface.co/docs/transformers.js) y el modelo `Xenova/trocr-small-handwritten`. La imagen de la libreta no se envía a ningún servidor. Los binarios de ONNX Runtime se sirven desde `public/ort/` para no depender de un CDN adicional.

El modelo está entrenado con texto manuscrito en inglés (IAM), así que **es una ayuda, no una transcripción perfecta**: puede omitir tildes o la ñ y confundir palabras cortas. Por eso el texto siempre aparece en una caja editable antes de guardarse. Si la descarga o la inferencia fallan, la caja sigue disponible para escribir el texto a mano; se guarda como texto real y no como imagen. Para mejorar el resultado, escribe una sola línea y separa ligeramente las palabras.

Las notas nuevas se guardan como texto (`text`) y funcionan como cualquier otro elemento de la lista. El campo `drawing` se conserva para las notas antiguas creadas antes de este cambio: se siguen mostrando como imagen y se pueden borrar o marcar como hechas. La libreta usa Canvas y Pointer Events (dedo, stylus y ratón).

## Limpieza semanal

El cuadrante vive en `src/lib/cleaning.js`: cuatro personas, catorce tareas fijas y dos tareas por día. `useCleaning` guarda solo los checks en `bbds.demo.cleaning.v1`, junto con la clave del lunes de esa semana. Si la clave guardada ya no coincide con la semana actual, el estado arranca vacío sin necesidad de un cron ni de un servidor. **Reiniciar semana** desmarca las tareas actuales.

Es una rutina de demostración editable en ese archivo. Mantén los `id` de las tareas estables: son la clave con la que se conservan los checks.

## Tiempo, radar y galería

`WeatherView` compone las condiciones actuales, la previsión de siete días y el radar. En demo, `src/lib/demo.js` genera el tiempo localmente. `RadarPanel` es una animación SVG sintética: no descarga teselas, mapas ni datos de lluvia. Sus controles de zoom y pausa son reales, pero la precipitación es ilustrativa. Para conectar un radar en vivo, sustituye el contenido del escenario manteniendo la cabecera, los controles y el pie como interfaz.

`src/lib/gallery.js` importa cuatro fotos locales de `src/assets/gallery/`; `Screensaver` las muestra en bucle cada 12 segundos sin hacer peticiones de red. Para usar fotos propias, sustituye los archivos y actualiza esa lista. El salvapantallas se abre tras el tiempo de inactividad configurado y también desde el botón de galería del rail.

## Configuración del frontend

Copia `.env.example` a `.env.local` (o crea las variables en el entorno de build):

```env
VITE_DEMO_MODE=false
VITE_API_BASE=
VITE_DASHBOARD_TOKEN=
VITE_LOCATION_NAME=Jaén
VITE_LATITUDE=37.7796
VITE_LONGITUDE=-3.7849
VITE_TIMEZONE=Europe/Madrid
VITE_NIGHT_START=22:30
VITE_NIGHT_END=07:30
VITE_CALENDAR_DAYS=21
VITE_CLIMATE_ENABLED=false
VITE_SCREENSAVER_IDLE_MINUTES=3
```

- `VITE_DEMO_MODE=false` es lo normal para producción. `npm run dev:demo` carga `.env.demo` con `true`.
- `VITE_API_BASE` se puede dejar vacío porque frontend y Worker comparten dominio. Vite redirige `/api` en desarrollo.
- `VITE_DASHBOARD_TOKEN` solo es necesario si activas `DASHBOARD_TOKEN` en el Worker. Es un token de cliente: acaba en el bundle, así que no lo consideres seguridad fuerte.
- `VITE_CLIMATE_ENABLED=false` (valor por defecto) oculta **Casa**, su deep link `#climate` y detiene las llamadas a `/api/sensors`. Inicio no muestra ninguna tarjeta de clima. Cuando lleguen los sensores, ponlo en `true`, vuelve a compilar y despliega. Los sensores y el simulador pueden seguir existiendo en el Worker mientras la interfaz está oculta.
- `VITE_CALENDAR_DAYS=21` controla la ventana de agenda que se pide al Worker.
- `VITE_SCREENSAVER_IDLE_MINUTES=3` son los minutos sin actividad antes de abrir la galería. Usa `0` para desactivar la apertura automática; el botón de galería del rail seguirá funcionando.
- El tiempo se pide a Open-Meteo desde el navegador, con caché de 24 h en `localStorage`. El radar y las fotos del salvapantallas no hacen peticiones externas.

## Worker y D1

### Secretos locales

Copia `.dev.vars.example` a `.dev.vars`:

```env
SENSOR_TOKEN=dev-sensor-token
DASHBOARD_TOKEN=
ICLOUD_ICS_URL=
```

`.dev.vars` está ignorado por Git.

### Calendario de iCloud

`ICLOUD_ICS_URL` debe ser el enlace público de un calendario compartido de iCloud, no tu contraseña de Apple:

1. En Calendario de iCloud, comparte el calendario como calendario público.
2. Copia el enlace `webcal://…` o `https://…`.
3. Pégalo en `.dev.vars` (`ICLOUD_ICS_URL=...`).

El Worker acepta `webcal://` y lo convierte a `https://`. Si la variable está vacía, `/api/calendar` responde `503` con `calendar_not_configured`; la interfaz lo muestra como calendario sin configurar. Si el enlace se revoca, habrá que actualizarlo.

La agenda es de solo lectura. El dashboard puede abrir la ficha de una cita para consultar fecha, hora y lugar, pero cualquier cambio se hace desde el dispositivo donde está el calendario original.

### Simulador de sensores

Con el Worker local arrancado:

```powershell
$env:SENSOR_TOKEN="dev-sensor-token"
npm run sensors:simulate -- --once
```

En macOS/Linux:

```bash
SENSOR_TOKEN=dev-sensor-token npm run sensors:simulate -- --once
```

Sin `--once` envía una lectura de `salon` y `dormitorio` cada 60 segundos. Variables útiles:

| Variable | Por defecto | Uso |
| --- | --- | --- |
| `WORKER_URL` | `http://127.0.0.1:8787` | URL del Worker |
| `SENSOR_IDS` | `salon,dormitorio` | ids separados por coma |
| `SENSOR_TOKEN` | vacío | mismo valor que el Worker |
| `INTERVAL_MS` | `60000` | intervalo entre lecturas |

El payload que debe enviar un ESP32 es:

```json
{
  "room": "salon",
  "temperature": 21.4,
  "humidity": 47.8,
  "pressure": 1012.6,
  "battery": 88.2
}
```

Cabecera obligatoria si existe `SENSOR_TOKEN`:

```http
X-Sensor-Token: dev-sensor-token
```

`pressure`, `battery` y `recordedAt` son opcionales. `recordedAt` debe ser una fecha ISO; si no se envía, el Worker usa la hora de recepción. Cada sensor debe hacer POST a `/api/sensors` aproximadamente cada minuto. El histórico se guarda desde la primera lectura.

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Estado y si calendario/tokens están configurados. |
| `POST` | `/api/sensors` | Lectura de un sensor. Requiere `X-Sensor-Token` si está configurado. |
| `GET` | `/api/sensors/latest` | Última lectura por habitación. |
| `GET` | `/api/sensors/history?hours=24&bucket=900` | Histórico agregado. |
| `GET` | `/api/lists` | Todas las listas. |
| `POST` | `/api/lists` | `{ listId, text, drawing? }`; `drawing` solo se usa para notas antiguas. |
| `PATCH` | `/api/lists/:id` | `{ done?, text? }`. |
| `DELETE` | `/api/lists/:id` | Borra un elemento. |
| `DELETE` | `/api/lists?list=shopping&done=1` | Limpia los hechos de una lista. |
| `GET` | `/api/calendar?days=21` | Eventos ICS transformados a JSON. |

Si configuras `DASHBOARD_TOKEN`, las rutas de lectura y las listas requieren `Authorization: Bearer <token>`; el calendario también. El POST de sensores usa `X-Sensor-Token` (o Bearer).

## Despliegue en Cloudflare

1. Crea la base de datos:

   ```bash
   npx wrangler login
   npx wrangler d1 create bbds-db
   ```

2. Copia el `database_id` que devuelve Wrangler en `wrangler.jsonc`. **El valor de ejemplo `00000000-0000-0000-0000-000000000000` no sirve para producción.**

3. Aplica las migraciones:

   ```bash
   npm run db:migrate
   ```

4. Configura secretos del Worker:

   ```bash
   npx wrangler secret put SENSOR_TOKEN
   npx wrangler secret put ICLOUD_ICS_URL
   # Opcional:
   npx wrangler secret put DASHBOARD_TOKEN
   ```

   Si usas `DASHBOARD_TOKEN`, define también `VITE_DASHBOARD_TOKEN` en el entorno de build.

5. Compila y despliega:

   ```bash
   npm run deploy
   ```

   Si ya hay sensores y quieres mostrar **Casa**, define `VITE_CLIMATE_ENABLED=true` en el entorno de build antes de compilar.

`npm run deploy` ejecuta `vite build` y `wrangler deploy`. El Worker sirve `dist` y la API desde el mismo origen. Para una URL privada, protege el Worker con Cloudflare Access en lugar de confiar solo en un token que viaja en el JavaScript.

### Mantenimiento de D1

- El nombre técnico de la base es `bbds-db`. Si vienes de una instalación anterior con otra base, ajusta `wrangler.jsonc` y los scripts o migra los datos con `wrangler d1 export` / `import`.
- Las notas manuscritas de elementos hechos se pueden borrar con el botón **Limpiar hechos** de cada lista.
- Haz copias periódicas si quieres conservar el histórico:

  ```bash
  npx wrangler d1 export bbds-db --remote --output bbds-backup.sql
  ```

## Kiosco en pared

- Añade el dashboard a la pantalla de inicio o instálalo si tu Chrome lo permite; el manifest ya declara orientación horizontal y modo `fullscreen`.
- Usa pantalla fijada, mantenimiento despierto y bloqueo de sueño del dispositivo.
- Si usas un WebView propio, apunta a Chromium actualizado. El build genera variantes modern y legacy (`@vitejs/plugin-legacy`), pero el diseño de cristal usa `backdrop-filter`, `color-mix()` y `gap` en flex; en WebViews muy antiguos se degrada el efecto de cristal y conviene revisar el layout.
- El OCR local necesita WebAssembly y un procesador razonablemente moderno. La primera descarga (~70 MB) puede tardar; en una tableta lenta el reconocimiento de una línea puede tardar varios segundos. Si el WebView no puede con ONNX Runtime, la libreta sigue permitiendo corregir el texto a mano.
- El salvapantallas no bloquea el dispositivo: solo cubre la interfaz y se cierra al tocar. No lo uses como bloqueo de seguridad.
- No hay service worker: sin red, el dashboard puede no cargar aunque el tiempo esté cacheado. El modelo de OCR y las fotos locales quedan en la caché del navegador, pero la app en sí necesita red para cargarse.
- El tercer sensor del oboe está preparado en `src/config.js` pero comentado; no forma parte de esta entrega.

## Estructura

```text
src/
  components/       vistas, tiempo/radar, limpieza, galería, agenda, listas, clima y libreta manuscrita
  hooks/            reloj, tiempo, limpieza, inactividad, sensores, calendario y listas
  lib/              API, clima, agenda, ICS, OCR, limpieza, galería, demo y utilidades
  assets/gallery/   fotos locales del salvapantallas
  config.js         lugar, modo noche, ventana de agenda, clima y tiempos del salvapantallas
  styles.css        tema papel/tinta BBDS y reglas responsive
  views.css         estilos de tiempo, radar, limpieza y galería
worker/
  index.js          Worker: API, D1, ICS y assets
migrations/
  0001_init.sql
  0002_list_drawings.sql
scripts/
  simulate-sensors.mjs
design/             estudios visuales estáticos A/B/C (no forman parte del build)
public/
  ort/              binarios WASM de ONNX Runtime
  favicon.svg, icon-*.png, manifest.webmanifest
wrangler.jsonc      Worker, assets y binding D1
```

## Estudios de diseño

Los tres estudios visuales viven en `design/` y se abren directamente en el navegador. No son rutas de la app ni entran en el build; la app actual sigue intacta. El estudio **C · Almanaque aurora** es la mezcla propuesta entre la identidad de cristal/aurora y la estructura editorial. Detalles y licencias de fuentes en [`design/README.md`](design/README.md).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Vite en desarrollo con proxy a `/api`. |
| `npm run dev:demo` | Demo sin Worker, con datos de ejemplo. |
| `npm run build` | Build moderno + legacy en `dist`. |
| `npm run preview` | Sirve el build con Vite. |
| `npm run api` | `wrangler dev` en `127.0.0.1:8787`. |
| `npm run db:migrate:local` | Aplica migraciones D1 locales. |
| `npm run db:migrate` | Aplica migraciones D1 remotas. |
| `npm run sensors:simulate` | Simula sensores. |
| `npm run deploy` | Build y despliegue del Worker. |

## Notas y límites reales

- El OCR es local y aproximado. TrOCR small está entrenado con letras inglesas y puede fallar con palabras cortas, tildes o ñ; el texto editable es parte del flujo, no un extra. No se indexa ni se envía a la nube.
- Las notas manuscritas antiguas siguen guardadas como imagen; las nuevas se guardan como texto.
- El radar es una animación ilustrativa local: sirve para validar la interfaz, no para consultar lluvia real. La conexión con una fuente meteorológica real queda como siguiente paso.
- La limpieza se guarda solo en este navegador; no se sincroniza entre dispositivos ni sale del kiosco.
- Las fotos del salvapantallas son de demostración (Unsplash) y están empaquetadas en la app. Sustitúyelas por fotos propias antes de usar el marco en producción.
- El token del dashboard no sustituye a autenticación real; usa Cloudflare Access si la URL es pública.
- El calendario depende de un enlace ICS público de iCloud y de que siga activo. BBDS no modifica el calendario.
- El tiempo y la agenda necesitan red. Los sensores se actualizan cada minuto; si un sensor deja de enviar, la interfaz marca la lectura como antigua.
- La base de datos y el Worker son de un solo hogar; no hay cuentas ni multiusuario.
- El dashboard es una herramienta doméstica: si lo expones en Internet, revisa los tokens, el acceso y las copias de seguridad.
