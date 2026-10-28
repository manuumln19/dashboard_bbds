const env = import.meta.env;

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes|on|sí|si)$/i.test(String(value).trim());
}

export const APP_NAME = "BBDS";
// Leído directamente (no a través de `env`) para que Vite lo sustituya por una
// constante al compilar: así todo el código y los datos de la demo desaparecen
// del paquete de producción.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// Permite publicar el dashboard sin la vista Casa, sus tarjetas ni las
// llamadas a /api/sensors hasta que haya sensores instalados.
export const CLIMATE_ENABLED = asFlag(env.VITE_CLIMATE_ENABLED, false);
// Menú semanal (Listas → Menú y el plato del día en Hoy). Apagado por ahora.
export const MENU_ENABLED = asFlag(env.VITE_MENU_ENABLED, false);
export const API_BASE = String(env.VITE_API_BASE || "").replace(/\/$/, "");
export const DASHBOARD_TOKEN = env.VITE_DASHBOARD_TOKEN || "";

export const LOCATION = {
  name: env.VITE_LOCATION_NAME || "Madrid",
  latitude: asNumber(env.VITE_LATITUDE, 40.4168),
  longitude: asNumber(env.VITE_LONGITUDE, -3.7038),
  timezone: env.VITE_TIMEZONE || "Europe/Madrid",
};

export const NIGHT = {
  start: env.VITE_NIGHT_START || "22:30",
  end: env.VITE_NIGHT_END || "07:30",
};

export const CALENDAR_DAYS = asNumber(env.VITE_CALENDAR_DAYS, 21);

// Salvapantallas de fotos. `0` desactiva el arranque automático, pero el
// botón de galería del rail sigue disponible para abrirlo a mano.
export const SCREENSAVER_IDLE_MINUTES = Math.max(
  0,
  asNumber(env.VITE_SCREENSAVER_IDLE_MINUTES, 3)
);
export const SCREENSAVER_IDLE_MS = SCREENSAVER_IDLE_MINUTES * 60 * 1000;

// Recarga nocturna y vuelta a Hoy tras un rato sin tocar la pantalla.
export const NIGHTLY_RELOAD_HOUR = Math.max(
  0,
  Math.min(23, Math.round(asNumber(env.VITE_NIGHTLY_RELOAD_HOUR, 3)))
);
export const IDLE_RETURN_MINUTES = Math.max(
  0,
  asNumber(env.VITE_IDLE_RETURN_MINUTES, 10)
);

// Cambia estos ids para que coincidan con el campo "room" que envía cada ESP32.
// Puedes añadir o quitar habitaciones: la interfaz se adapta sola.
export const ROOMS = [
  {
    id: "salon",
    name: "Salón",
    icon: "sofa",
    targetMin: 40,
    targetMax: 60,
    alertMax: 65,
    color: "#efa174",
  },
  {
    id: "dormitorio",
    name: "Dormitorio",
    icon: "bed",
    targetMin: 40,
    targetMax: 60,
    alertMax: 65,
    color: "#a9c3ad",
  },
  // Tercer sensor para el oboe / estudio. Descomenta cuando lo tengas:
  // {
  //   id: "estudio",
  //   name: "Estudio · oboe",
  //   icon: "music",
  //   targetMin: 40,
  //   targetMax: 60,
  //   alertMax: 65,
  //   minTemperature: 18,
  //   color: "#c9b4dc",
  // },
];

export const INTRO = {
  kicker: "BBDS · Nuestra casa",
  subtitle: "Lo importante de hoy, sin ruido.",
};
