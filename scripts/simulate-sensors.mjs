#!/usr/bin/env node
/**
 * Simulador de sensores para probar BBDS sin hardware.
 *
 * Uso:
 *   npm run sensors:simulate
 *   npm run sensors:simulate -- --once
 *
 * Variables:
 *   WORKER_URL      URL del Worker (por defecto http://127.0.0.1:8787)
 *   SENSOR_IDS      ids separados por coma (por defecto salon,dormitorio)
 *   SENSOR_TOKEN    token compartido con el Worker, si está configurado
 *   INTERVAL_MS     intervalo entre envíos (por defecto 60000)
 */

const WORKER_URL = String(
  process.env.WORKER_URL || process.env.NIDO_URL || "http://127.0.0.1:8787"
).replace(/\/$/, "");
const SENSOR_TOKEN = process.env.SENSOR_TOKEN || "";
const INTERVAL_MS = Math.max(
  5000,
  Number(process.env.INTERVAL_MS) || 60_000
);
const ONCE = process.argv.includes("--once") || process.env.ONCE === "1";
const ROOM_IDS = String(process.env.SENSOR_IDS || "salon,dormitorio")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const states = new Map();

function createState(roomId) {
  const seed = [...roomId].reduce((total, char) => total + char.charCodeAt(0), 0);
  return {
    temperature: 20.6 + (seed % 7) * 0.25,
    humidity: 44 + (seed % 11) * 0.8,
    pressure: 1009 + (seed % 9),
    battery: 78 + (seed % 18),
  };
}

function drift(value, amount, min, max) {
  const next = value + (Math.random() - 0.5) * amount;
  return Math.min(max, Math.max(min, next));
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function sendReading(roomId) {
  const state = states.get(roomId) || createState(roomId);
  states.set(roomId, state);

  state.temperature = drift(state.temperature, 0.22, 17, 26);
  state.humidity = drift(state.humidity, 1.1, 34, 68);
  state.pressure = drift(state.pressure, 0.8, 995, 1032);
  state.battery = Math.max(5, state.battery - 0.001);

  const reading = {
    room: roomId,
    temperature: round(state.temperature, 2),
    humidity: round(state.humidity, 1),
    pressure: round(state.pressure, 1),
    battery: round(state.battery, 1),
    recordedAt: new Date().toISOString(),
  };

  const headers = { "Content-Type": "application/json" };
  if (SENSOR_TOKEN) headers["X-Sensor-Token"] = SENSOR_TOKEN;

  const response = await fetch(`${WORKER_URL}/api/sensors`, {
    method: "POST",
    headers,
    body: JSON.stringify(reading),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `${roomId}: HTTP ${response.status}${detail ? ` · ${detail}` : ""}`
    );
  }

  const clock = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(
    `[${clock}] ${roomId.padEnd(11)} ${reading.temperature.toFixed(1)} °C · ${reading.humidity.toFixed(
      0
    )} % · ${reading.pressure.toFixed(0)} hPa · batería ${reading.battery.toFixed(0)} %`
  );
}

async function tick() {
  const results = await Promise.allSettled(ROOM_IDS.map(sendReading));
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error(
        `[sensor] ${result.reason instanceof Error ? result.reason.message : result.reason}`
      );
    }
  });

  if (ONCE) {
    if (results.some((result) => result.status === "rejected")) {
      process.exitCode = 1;
    }
    return;
  }
  setTimeout(tick, INTERVAL_MS);
}

if (!ROOM_IDS.length) {
  console.error("SENSOR_IDS está vacío.");
  process.exit(1);
}

console.log(`BBDS · simulando ${ROOM_IDS.join(", ")} en ${WORKER_URL}`);
console.log(
  ONCE
    ? "Enviando una lectura y saliendo…"
    : `Enviando cada ${Math.round(INTERVAL_MS / 1000)} s. Ctrl+C para parar.`
);

tick().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
