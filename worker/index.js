import ICAL from "ical.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  // La caché del service worker guarda por token: un cambio de token no
  // reutiliza respuestas de la sesión anterior.
  "Vary": "Authorization",
};

const LIST_IDS = new Set(["shopping", "tasks"]);
const TONES = new Set(["pink", "mint", "amber", "lilac", "ink"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TASK_ID_RE = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const CALENDAR_CACHE_MS = 5 * 60 * 1000;
const CALENDAR_STALE_MS = 20 * 60 * 1000;
// La caché es por feed y ventana: dos calendarios no se pisan entre sí.
const calendarCache = new Map();

const ELECTRICITY_CACHE_MS = 10 * 60 * 1000;
const ELECTRICITY_MAX_DAYS = 4;
const REE_PVPC_URL =
  "https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real";
const ESIOS_PVPC_URL = "https://api.esios.ree.es/indicators/1001";
const PVPC_NOTE =
  "PVPC 2.0 TD (Península). Incluye peajes y cargos; no incluye IEE ni IVA.";
let electricityCache = null;

class HttpError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

function requireDashboard(request, env) {
  if (!env.DASHBOARD_TOKEN) return;
  const supplied = bearerToken(request);
  if (!safeEqual(supplied, env.DASHBOARD_TOKEN)) {
    throw new HttpError(401, "Necesitas autorización para ver estos datos", "unauthorized");
  }
}

function requireSensor(request, env) {
  if (!env.SENSOR_TOKEN) return;
  const supplied =
    request.headers.get("x-sensor-token") || bearerToken(request) || "";
  if (!safeEqual(supplied, env.SENSOR_TOKEN)) {
    throw new HttpError(401, "Token de sensor incorrecto", "sensor_unauthorized");
  }
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "El cuerpo de la petición no es JSON válido");
  }
}

function parseInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowToListItem(row) {
  return {
    id: row.id,
    listId: row.list_id,
    text: row.text,
    drawing: row.drawing || null,
    done: Boolean(row.done),
    dueOn: row.due_on || null,
    dueAt: row.due_at || null,
    person: row.person_id
      ? {
          id: row.person_id,
          name: row.person_name || row.person_id,
          tone: TONES.has(row.person_tone) ? row.person_tone : "ink",
          initials: row.person_initials || "",
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPerson(row) {
  return {
    id: row.id,
    name: row.name,
    tone: TONES.has(row.tone) ? row.tone : "ink",
    initials: row.initials || "",
  };
}

function rowToCleaningTask(row) {
  return {
    id: row.id,
    day: Number(row.day_of_week),
    personId: row.person_id,
    person: {
      id: row.person_id,
      name: row.person_name || row.person_id,
      tone: TONES.has(row.person_tone) ? row.person_tone : "ink",
      initials: row.person_initials || "",
    },
    area: row.area,
    title: row.title,
    position: Number(row.position || 0),
    active: Boolean(row.active),
    done: Boolean(row.done),
  };
}

function rowToCalendar(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    color: TONES.has(row.color) ? row.color : "lilac",
    personId: row.person_id || null,
    person: row.person_id
      ? {
          id: row.person_id,
          name: row.person_name || row.person_id,
          tone: TONES.has(row.person_tone) ? row.person_tone : "ink",
          initials: row.person_initials || "",
        }
      : null,
    active: Boolean(row.active),
    lastSyncAt: row.last_sync_at || null,
    lastError: row.last_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeDateValue(raw, label = "La fecha") {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim();
  if (!DATE_RE.test(value)) {
    throw new HttpError(400, `${label} debe tener el formato YYYY-MM-DD`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpError(400, `${label} no es una fecha real`);
  }
  return value;
}

function normalizeTimeValue(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = String(raw).trim();
  if (!TIME_RE.test(value)) {
    throw new HttpError(400, "La hora debe tener el formato HH:MM");
  }
  return value;
}

function currentWeekKey(reference = new Date()) {
  const date = new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate()
    )
  );
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

function normalizeWeekKey(raw) {
  if (raw === undefined || raw === null || raw === "") return currentWeekKey();
  const value = normalizeDateValue(raw, "La semana");
  return value;
}

function normalizeTone(raw, fallback = "lilac") {
  const value = String(raw || "").trim();
  return TONES.has(value) ? value : fallback;
}

function normalizeLabel(raw, label, maxLength) {
  const value = normalizeText(raw);
  if (!value) throw new HttpError(400, `${label} no puede estar vacío`);
  if (value.length > maxLength) {
    throw new HttpError(400, `${label} no puede pasar de ${maxLength} caracteres`);
  }
  return value;
}

async function getPerson(env, personId) {
  if (!personId) return null;
  const row = await env.DB.prepare(
    "SELECT id, name, tone, initials FROM people WHERE id = ?"
  )
    .bind(String(personId))
    .first();
  if (!row) throw new HttpError(400, "Persona desconocida");
  return rowToPerson(row);
}

function normalizeCalendarUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new HttpError(400, "La URL del calendario no puede estar vacía");
  if (value.length > 2048) throw new HttpError(400, "La URL es demasiado larga");
  const normalized = value.startsWith("webcal://")
    ? `https://${value.slice(9)}`
    : value;
  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new HttpError(400, "La URL del calendario no es válida");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new HttpError(400, "El calendario debe usar http(s) o webcal");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    throw new HttpError(400, "No se pueden leer calendarios de la red local");
  }
  // El enlace público de Google Calendar no es un ICS: apunta a la vista web.
  if (/calendar\.google\.com$/i.test(host) && /[?&]cid=/i.test(url.search)) {
    throw new HttpError(
      400,
      "Ese es el enlace público de Google. Usa la dirección secreta en formato iCal (termina en .ics)",
      "calendar_public_url"
    );
  }
  if (/\/(embed|calendar\/u\/\d+)\/?$/i.test(url.pathname)) {
    throw new HttpError(
      400,
      "Ese enlace abre la vista web del calendario. Usa su dirección iCal",
      "calendar_public_url"
    );
  }
  return normalized;
}

function normalizeDrawing(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!/^data:image\/(png|webp|jpeg);base64,[a-zA-Z0-9+/=\s]+$/.test(candidate)) {
    return null;
  }
  // Mantiene las filas de D1 razonables: unas 40–60 notas por lista.
  if (candidate.length > 900000) {
    throw new HttpError(413, "El dibujo es demasiado grande");
  }
  return candidate;
}

const madridDayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function madridDateKey(date) {
  const parts = madridDayFormatter.formatToParts(date);
  const values = {};
  parts.forEach((part) => {
    if (part.type !== "literal") values[part.type] = part.value;
  });
  return `${values.year}-${values.month}-${values.day}`;
}

function addDaysToDateKey(key, days) {
  const [year, month, day] = String(key).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function roundPrice(value) {
  return Math.round(value * 100000) / 100000;
}

// Convierte valores de PVPC en €/MWh a horas en €/kWh, sin duplicados y
// agrupadas por día local de Madrid. Así el cliente no tiene que adivinar
// cómo repartir un cambio de hora.
function groupPvpcValues(values) {
  const hoursByStart = new Map();

  values.forEach((entry) => {
    const stamp = Date.parse(entry.datetime_utc || entry.datetime);
    const rawPrice = Number(entry.value);
    if (!Number.isFinite(stamp) || !Number.isFinite(rawPrice)) return;
    const price = rawPrice / 1000;
    // Un PVPC doméstico no debería salir de este rango; si la fuente cambia
    // de unidad o devuelve un error, es mejor no pintar una barbaridad.
    if (price < -0.5 || price > 3) return;
    const start = new Date(stamp).toISOString();
    if (!hoursByStart.has(start)) {
      hoursByStart.set(start, { start, price: roundPrice(price) });
    }
  });

  const grouped = new Map();
  hoursByStart.forEach((hour) => {
    const date = madridDateKey(new Date(hour.start));
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(hour);
  });

  const days = Array.from(grouped.keys())
    .sort()
    .slice(-ELECTRICITY_MAX_DAYS)
    .map((date) => ({
      date,
      hours: grouped.get(date).sort((a, b) => a.start.localeCompare(b.start)),
    }));

  return { days, count: hoursByStart.size };
}

export function parseReeElectricity(payload, fetchedAt = new Date()) {
  const included = payload && Array.isArray(payload.included) ? payload.included : [];
  let series = null;
  for (let index = 0; index < included.length; index += 1) {
    const entry = included[index];
    if (String(entry.id) === "1001" || String(entry.type).toUpperCase() === "PVPC") {
      series = entry;
      break;
    }
  }
  if (!series || !series.attributes || !Array.isArray(series.attributes.values)) {
    throw new Error("La respuesta de REE no incluye la serie PVPC 1001");
  }

  const result = groupPvpcValues(series.attributes.values);
  if (!result.days.length) {
    throw new Error("La respuesta de REE no contiene horas PVPC válidas");
  }

  return {
    days: result.days,
    updatedAt:
      isoDateOrNull(series.attributes["last-update"]) ||
      isoDateOrNull(
        payload.data &&
          payload.data.attributes &&
          payload.data.attributes["last-update"]
      ) ||
      fetchedAt.toISOString(),
  };
}

export function parseEsiosElectricity(payload, fetchedAt = new Date()) {
  const indicator = payload && payload.indicator ? payload.indicator : payload;
  const values =
    indicator && Array.isArray(indicator.values) ? indicator.values : [];
  if (!values.length) {
    throw new Error("La respuesta de ESIOS no contiene valores PVPC");
  }

  // La serie 1001 incluye varias zonas. La Península es 8741; si la fuente
  // no trae geos, se aceptan todos los valores.
  const peninsula = values.filter(
    (entry) =>
      Number(entry.geo_id) === 8741 || /pen[ií]nsula/i.test(entry.geo_name || "")
  );
  const chosen = peninsula.length ? peninsula : values;
  const result = groupPvpcValues(chosen);
  if (!result.days.length) {
    throw new Error("La respuesta de ESIOS no contiene horas PVPC válidas");
  }

  return {
    days: result.days,
    updatedAt:
      isoDateOrNull(indicator.values_updated_at) || fetchedAt.toISOString(),
  };
}

function electricitySource(id) {
  return {
    id,
    label:
      id === "ree-pvpc"
        ? "REE · PVPC 2.0 TD"
        : "ESIOS · PVPC 2.0 TD",
    priceType: "pvpc",
    note: PVPC_NOTE,
    url:
      id === "ree-pvpc"
        ? "https://www.ree.es/es/apidatos"
        : "https://www.esios.ree.es/es/1001",
    demo: false,
  };
}

function filterElectricityDays(days, minKey, maxKey) {
  return days.filter((day) => day.date >= minKey && day.date <= maxKey);
}

async function fetchElectricityJson(url, headers, timeout = 12000) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    throw new Error(`La fuente de precios respondió ${response.status}`);
  }
  return response.json();
}

async function fetchElectricityPrices(env, now = new Date()) {
  const fetchedAt = new Date();
  const todayKey = madridDateKey(now);
  const minKey = addDaysToDateKey(todayKey, -1);
  const maxKey = addDaysToDateKey(todayKey, 1);
  const errors = [];

  try {
    const url = new URL(REE_PVPC_URL);
    url.searchParams.set("start_date", `${minKey}T00:00`);
    url.searchParams.set("end_date", `${maxKey}T23:59`);
    url.searchParams.set("time_trunc", "hour");
    url.searchParams.set("lang", "es");
    const payload = await fetchElectricityJson(url.toString(), {
      Accept: "application/json",
      "User-Agent": "BBDSDashboard/1.0",
    });
    const parsed = parseReeElectricity(payload, fetchedAt);
    const days = filterElectricityDays(parsed.days, minKey, maxKey);
    if (!days.length) throw new Error("REE no devolvió días en la ventana pedida");
    return {
      source: electricitySource("ree-pvpc"),
      days,
      updatedAt: parsed.updatedAt,
      fetchedAt: fetchedAt.toISOString(),
      stale: false,
      timezone: "Europe/Madrid",
    };
  } catch (error) {
    errors.push(`REE: ${error instanceof Error ? error.message : "error"}`);
  }

  try {
    const headers = {
      Accept: "application/json",
      "User-Agent": "BBDSDashboard/1.0",
    };
    if (env.ESIOS_TOKEN) headers["X-API-KEY"] = env.ESIOS_TOKEN;
    const payload = await fetchElectricityJson(
      ESIOS_PVPC_URL,
      headers,
      15000
    );
    const parsed = parseEsiosElectricity(payload, fetchedAt);
    const days = filterElectricityDays(parsed.days, minKey, maxKey);
    if (!days.length) {
      throw new Error("ESIOS no devolvió días en la ventana pedida");
    }
    return {
      source: electricitySource("esios-pvpc"),
      days,
      updatedAt: parsed.updatedAt,
      fetchedAt: fetchedAt.toISOString(),
      stale: false,
      timezone: "Europe/Madrid",
    };
  } catch (error) {
    errors.push(`ESIOS: ${error instanceof Error ? error.message : "error"}`);
  }

  throw new Error(errors.join(" · "));
}

async function handleElectricity(request, env) {
  requireDashboard(request, env);
  if (request.method !== "GET") {
    throw new HttpError(405, "Método no permitido");
  }

  if (electricityCache && electricityCache.expiresAt > Date.now()) {
    return json(electricityCache.payload, 200, {
      "Cache-Control": "private, max-age=60",
    });
  }

  try {
    const payload = await fetchElectricityPrices(env);
    electricityCache = {
      payload,
      expiresAt: Date.now() + ELECTRICITY_CACHE_MS,
    };
    return json(payload, 200, {
      "Cache-Control": "private, max-age=60",
    });
  } catch (error) {
    console.error("BBDS electricity error", error);
    if (electricityCache) {
      return json(
        {
          ...electricityCache.payload,
          stale: true,
          warning:
            "No se pudo actualizar el precio. Se muestran los últimos datos guardados.",
        },
        200,
        { "Cache-Control": "no-store" }
      );
    }
    throw new HttpError(
      502,
      "No se pudieron consultar los precios PVPC. Inténtalo de nuevo más tarde.",
      "electricity_fetch_failed"
    );
  }
}

async function handleSensors(request, env, url) {
  if (request.method === "POST") {
    requireSensor(request, env);
    const body = await readJson(request);

    const roomId = normalizeText(body.room ?? body.roomId).toLowerCase();
    if (!/^[a-z0-9_-]{1,32}$/.test(roomId)) {
      throw new HttpError(400, "La habitación debe ser un id corto, por ejemplo 'salon'");
    }

    const temperature = Number(body.temperature);
    const humidity = Number(body.humidity);
    const pressure =
      body.pressure === undefined || body.pressure === null || body.pressure === ""
        ? null
        : Number(body.pressure);
    const battery =
      body.battery === undefined || body.battery === null || body.battery === ""
        ? null
        : Number(body.battery);

    if (!Number.isFinite(temperature) || temperature < -30 || temperature > 60) {
      throw new HttpError(400, "Temperatura fuera de rango (-30 a 60 °C)");
    }
    if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100) {
      throw new HttpError(400, "Humedad fuera de rango (0 a 100 %)");
    }
    if (
      pressure !== null &&
      (!Number.isFinite(pressure) || pressure < 300 || pressure > 1100)
    ) {
      throw new HttpError(400, "Presión fuera de rango (300 a 1100 hPa)");
    }
    if (
      battery !== null &&
      (!Number.isFinite(battery) || battery < 0 || battery > 100)
    ) {
      throw new HttpError(400, "Batería fuera de rango (0 a 100 %)");
    }

    const now = new Date();
    let recordedAt = now.toISOString();
    if (body.recordedAt) {
      const candidate = new Date(body.recordedAt);
      const minTime = Date.parse("2020-01-01T00:00:00Z");
      if (
        Number.isFinite(candidate.getTime()) &&
        candidate.getTime() > minTime &&
        candidate.getTime() < now.getTime() + 10 * 60 * 1000
      ) {
        recordedAt = candidate.toISOString();
      }
    }

    await env.DB.prepare(
      `INSERT OR REPLACE INTO readings
        (room_id, temperature, humidity, pressure, battery, recorded_at, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        roomId,
        Math.round(temperature * 100) / 100,
        Math.round(humidity * 100) / 100,
        pressure === null ? null : Math.round(pressure * 100) / 100,
        battery === null ? null : Math.round(battery * 10) / 10,
        recordedAt,
        now.toISOString()
      )
      .run();

    return json(
      {
        ok: true,
        reading: {
          roomId,
          temperature,
          humidity,
          pressure,
          battery,
          recordedAt,
        },
      },
      201
    );
  }

  if (request.method === "GET" && url.pathname.endsWith("/latest")) {
    requireDashboard(request, env);
    const { results } = await env.DB.prepare(
      `SELECT room_id AS roomId, temperature, humidity, pressure, battery,
              recorded_at AS recordedAt
       FROM readings AS r
       WHERE recorded_at = (
         SELECT MAX(recorded_at) FROM readings WHERE room_id = r.room_id
       )
       ORDER BY room_id`
    ).all();

    return json({ readings: results || [] });
  }

  if (request.method === "GET" && url.pathname.endsWith("/history")) {
    requireDashboard(request, env);
    const hours = parseInteger(url.searchParams.get("hours"), 24, 1, 8760);
    const bucket = parseInteger(url.searchParams.get("bucket"), 900, 60, 86400);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { results } = await env.DB.prepare(
      `WITH bucketed AS (
         SELECT room_id, temperature, humidity,
                (CAST(strftime('%s', recorded_at) AS INTEGER) / ?) * ? AS bucket_epoch
         FROM readings
         WHERE recorded_at >= ?
       )
       SELECT room_id AS roomId, bucket_epoch,
              ROUND(AVG(temperature), 2) AS temperature,
              ROUND(AVG(humidity), 2) AS humidity
       FROM bucketed
       GROUP BY room_id, bucket_epoch
       ORDER BY bucket_epoch ASC
       LIMIT 20000`
    )
      .bind(bucket, bucket, since)
      .all();

    return json({
      readings: (results || []).map((row) => ({
        roomId: row.roomId,
        at: new Date(Number(row.bucket_epoch) * 1000).toISOString(),
        temperature: row.temperature,
        humidity: row.humidity,
      })),
      hours,
      bucket,
    });
  }

  throw new HttpError(405, "Método no permitido");
}

const LIST_ITEM_SELECT = `SELECT li.id, li.list_id, li.text, li.drawing, li.done,
       li.created_at, li.updated_at, li.due_on, li.due_at, li.person_id,
       p.name AS person_name, p.tone AS person_tone, p.initials AS person_initials
  FROM list_items li
  LEFT JOIN people p ON p.id = li.person_id`;

async function fetchPeople(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, tone, initials FROM people ORDER BY created_at ASC, id ASC"
  ).all();
  return (results || []).map(rowToPerson);
}

async function fetchListItem(env, id) {
  const row = await env.DB.prepare(`${LIST_ITEM_SELECT} WHERE li.id = ?`)
    .bind(id)
    .first();
  if (!row) throw new HttpError(404, "Elemento no encontrado");
  return rowToListItem(row);
}

async function handleLists(request, env, url) {
  requireDashboard(request, env);

  if (url.pathname === "/api/lists") {
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        `${LIST_ITEM_SELECT} ORDER BY li.created_at ASC, li.id ASC`
      ).all();
      return json({
        items: (results || []).map(rowToListItem),
        people: await fetchPeople(env),
      });
    }

    if (request.method === "POST") {
      const body = await readJson(request);
      const listId = String(body.listId || "");
      const text = normalizeText(body.text);
      const drawing = normalizeDrawing(body.drawing);
      const isTask = listId === "tasks";

      if (!LIST_IDS.has(listId)) {
        throw new HttpError(400, "Lista desconocida");
      }
      if (body.drawing && !drawing) {
        throw new HttpError(400, "El dibujo no es una imagen válida");
      }
      if (!text && !drawing) {
        throw new HttpError(400, "Escribe el texto o dibuja una nota");
      }
      if (text.length > 160) {
        throw new HttpError(400, "El texto no puede pasar de 160 caracteres");
      }

      const dueOn = isTask ? normalizeDateValue(body.dueOn, "La fecha") : null;
      const dueAt = isTask ? normalizeTimeValue(body.dueAt) : null;
      if (dueAt && !dueOn) {
        throw new HttpError(400, "Para poner una hora, indica también el día");
      }
      const person = isTask ? await getPerson(env, body.personId) : null;

      const finalText = text || "Nota manuscrita";
      const now = new Date().toISOString();
      const result = await env.DB.prepare(
        `INSERT INTO list_items
          (list_id, text, drawing, done, due_on, due_at, person_id, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`
      )
        .bind(
          listId,
          finalText,
          drawing,
          dueOn,
          dueAt,
          person ? person.id : null,
          now,
          now
        )
        .run();

      return json(
        { item: await fetchListItem(env, result.meta.last_row_id) },
        201
      );
    }

    if (request.method === "DELETE") {
      const listId = String(url.searchParams.get("list") || "");
      if (!LIST_IDS.has(listId) || url.searchParams.get("done") !== "1") {
        throw new HttpError(400, "Indica una lista y done=1");
      }
      await env.DB.prepare(
        "DELETE FROM list_items WHERE list_id = ? AND done = 1"
      )
        .bind(listId)
        .run();
      return json({ ok: true });
    }
  }

  const match = url.pathname.match(/^\/api\/lists\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);

    if (request.method === "PATCH") {
      const body = await readJson(request);
      const hasDone = typeof body.done === "boolean";
      const hasText = typeof body.text === "string";
      const hasDueOn = Object.prototype.hasOwnProperty.call(body, "dueOn");
      const hasDueAt = Object.prototype.hasOwnProperty.call(body, "dueAt");
      const hasPerson = Object.prototype.hasOwnProperty.call(body, "personId");
      if (!hasDone && !hasText && !hasDueOn && !hasDueAt && !hasPerson) {
        throw new HttpError(400, "Nada que actualizar");
      }

      const existing = await env.DB.prepare(
        "SELECT * FROM list_items WHERE id = ?"
      )
        .bind(id)
        .first();
      if (!existing) throw new HttpError(404, "Elemento no encontrado");

      let text = existing.text;
      if (hasText) {
        text = normalizeText(body.text);
        if (!text) throw new HttpError(400, "El texto no puede estar vacío");
        if (text.length > 160) {
          throw new HttpError(400, "El texto no puede pasar de 160 caracteres");
        }
      }

      let dueOn = existing.due_on || null;
      let dueAt = existing.due_at || null;
      let personId = existing.person_id || null;

      if (existing.list_id === "tasks") {
        if (hasDueOn) {
          dueOn = normalizeDateValue(body.dueOn, "La fecha");
          if (!dueOn) dueAt = null;
        }
        if (hasDueAt) {
          dueAt = normalizeTimeValue(body.dueAt);
        }
        if (dueAt && !dueOn) {
          throw new HttpError(400, "Para poner una hora, indica también el día");
        }
        if (hasPerson) {
          const person = await getPerson(env, body.personId);
          personId = person ? person.id : null;
        }
      }

      await env.DB.prepare(
        `UPDATE list_items
         SET done = ?, text = ?, due_on = ?, due_at = ?, person_id = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(
          hasDone ? (body.done ? 1 : 0) : existing.done,
          text,
          dueOn,
          dueAt,
          personId,
          new Date().toISOString(),
          id
        )
        .run();

      return json({ item: await fetchListItem(env, id) });
    }

    if (request.method === "DELETE") {
      const result = await env.DB.prepare(
        "DELETE FROM list_items WHERE id = ?"
      )
        .bind(id)
        .run();
      if (!result.meta.changes) throw new HttpError(404, "Elemento no encontrado");
      return json({ ok: true });
    }
  }

  throw new HttpError(405, "Método no permitido");
}

async function handlePeople(request, env, url) {
  requireDashboard(request, env);

  if (url.pathname === "/api/people" && request.method === "GET") {
    return json({ people: await fetchPeople(env) });
  }

  const match = url.pathname.match(/^\/api\/people\/([a-z0-9_-]+)$/);
  if (!match) throw new HttpError(405, "Método no permitido");

  if (request.method !== "PATCH") {
    throw new HttpError(405, "Método no permitido");
  }

  const id = match[1];
  const existing = await env.DB.prepare(
    "SELECT id, name, tone, initials FROM people WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!existing) throw new HttpError(404, "Persona no encontrada");

  const body = await readJson(request);
  const name = Object.prototype.hasOwnProperty.call(body, "name")
    ? normalizeLabel(body.name, "El nombre", 40)
    : existing.name;
  const tone = Object.prototype.hasOwnProperty.call(body, "tone")
    ? normalizeTone(body.tone, existing.tone)
    : existing.tone;
  const initials = Object.prototype.hasOwnProperty.call(body, "initials")
    ? normalizeText(body.initials).slice(0, 3).toUpperCase()
    : existing.initials || "";

  await env.DB.prepare(
    "UPDATE people SET name = ?, tone = ?, initials = ?, updated_at = ? WHERE id = ?"
  )
    .bind(name, tone, initials || null, new Date().toISOString(), id)
    .run();

  const row = await env.DB.prepare(
    "SELECT id, name, tone, initials FROM people WHERE id = ?"
  )
    .bind(id)
    .first();
  return json({ person: rowToPerson(row) });
}

async function cleaningTaskPayload(env, body, existing = null) {
  const day =
    body.day === undefined
      ? existing
        ? Number(existing.day_of_week)
        : null
      : Number(body.day);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new HttpError(400, "El día debe estar entre 0 (lunes) y 6 (domingo)");
  }

  const rawPerson =
    body.personId === undefined
      ? existing
        ? existing.person_id
        : ""
      : body.personId;
  const person = await getPerson(env, rawPerson);
  if (!person) throw new HttpError(400, "Asigna la tarea a Manu o a Paco");

  const area =
    body.area === undefined
      ? existing
        ? existing.area
        : ""
      : normalizeLabel(body.area, "La zona", 40);
  const title =
    body.title === undefined
      ? existing
        ? existing.title
        : ""
      : normalizeLabel(body.title, "La tarea", 80);

  let position = existing ? Number(existing.position) || 0 : 0;
  if (body.position !== undefined) {
    const candidate = Number(body.position);
    if (!Number.isFinite(candidate)) {
      throw new HttpError(400, "La posición no es válida");
    }
    position = Math.max(0, Math.min(999, Math.trunc(candidate)));
  }

  return {
    day,
    personId: person.id,
    area: normalizeLabel(area, "La zona", 40),
    title: normalizeLabel(title, "La tarea", 80),
    position,
  };
}

async function fetchCleaningTask(env, id) {
  const row = await env.DB.prepare(
    `SELECT t.*, p.name AS person_name, p.tone AS person_tone,
            p.initials AS person_initials
       FROM cleaning_tasks t
       LEFT JOIN people p ON p.id = t.person_id
      WHERE t.id = ?`
  )
    .bind(id)
    .first();
  if (!row) throw new HttpError(404, "Tarea no encontrada");
  return rowToCleaningTask(row);
}

async function handleCleaning(request, env, url) {
  requireDashboard(request, env);

  if (url.pathname === "/api/cleaning" && request.method === "GET") {
    const weekKey = normalizeWeekKey(url.searchParams.get("week"));
    const [tasksResult, checksResult, people] = await Promise.all([
      env.DB.prepare(
        `SELECT t.*, p.name AS person_name, p.tone AS person_tone,
                p.initials AS person_initials
           FROM cleaning_tasks t
           LEFT JOIN people p ON p.id = t.person_id
          WHERE t.active = 1
          ORDER BY t.day_of_week ASC, t.position ASC, t.id ASC`
      ).all(),
      env.DB.prepare(
        "SELECT task_id, done FROM cleaning_checks WHERE week_key = ?"
      )
        .bind(weekKey)
        .all(),
      fetchPeople(env),
    ]);

    const checks = new Map(
      (checksResult.results || []).map((row) => [
        row.task_id,
        Boolean(row.done),
      ])
    );
    const tasks = (tasksResult.results || []).map((row) => ({
      ...rowToCleaningTask(row),
      done: checks.get(row.id) || false,
    }));

    return json({
      weekKey,
      people,
      tasks,
      updatedAt: new Date().toISOString(),
    });
  }

  if (url.pathname === "/api/cleaning/checks" && request.method === "PATCH") {
    const body = await readJson(request);
    const weekKey = normalizeWeekKey(body.weekKey);
    const taskId = String(body.taskId || "");
    if (!TASK_ID_RE.test(taskId)) {
      throw new HttpError(400, "Tarea desconocida");
    }
    const task = await env.DB.prepare(
      "SELECT id FROM cleaning_tasks WHERE id = ? AND active = 1"
    )
      .bind(taskId)
      .first();
    if (!task) throw new HttpError(404, "Tarea no encontrada");

    const done = Boolean(body.done);
    const now = new Date().toISOString();
    if (done) {
      await env.DB.prepare(
        `INSERT INTO cleaning_checks (week_key, task_id, done, updated_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(week_key, task_id)
         DO UPDATE SET done = 1, updated_at = excluded.updated_at`
      )
        .bind(weekKey, taskId, now)
        .run();
    } else {
      await env.DB.prepare(
        "DELETE FROM cleaning_checks WHERE week_key = ? AND task_id = ?"
      )
        .bind(weekKey, taskId)
        .run();
    }

    return json({ ok: true, weekKey, taskId, done });
  }

  if (url.pathname === "/api/cleaning/reset" && request.method === "POST") {
    const body = await readJson(request);
    const weekKey = normalizeWeekKey(body.weekKey);
    await env.DB.prepare(
      "DELETE FROM cleaning_checks WHERE week_key = ?"
    )
      .bind(weekKey)
      .run();
    return json({ ok: true, weekKey });
  }

  if (url.pathname === "/api/cleaning/tasks" && request.method === "POST") {
    const body = await readJson(request);
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM cleaning_tasks WHERE active = 1"
    ).first();
    if (Number(count.n) >= 40) {
      throw new HttpError(400, "El cuadrante no puede pasar de 40 tareas");
    }
    const payload = await cleaningTaskPayload(env, body);
    const id = `task-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO cleaning_tasks
        (id, day_of_week, person_id, area, title, position, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
      .bind(
        id,
        payload.day,
        payload.personId,
        payload.area,
        payload.title,
        payload.position,
        now,
        now
      )
      .run();
    return json({ task: await fetchCleaningTask(env, id) }, 201);
  }

  const match = url.pathname.match(/^\/api\/cleaning\/tasks\/([a-z0-9_-]+)$/);
  if (match) {
    const id = match[1];
    const existing = await env.DB.prepare(
      "SELECT * FROM cleaning_tasks WHERE id = ? AND active = 1"
    )
      .bind(id)
      .first();
    if (!existing) throw new HttpError(404, "Tarea no encontrada");

    if (request.method === "PATCH") {
      const body = await readJson(request);
      const payload = await cleaningTaskPayload(env, body, existing);
      await env.DB.prepare(
        `UPDATE cleaning_tasks
            SET day_of_week = ?, person_id = ?, area = ?, title = ?,
                position = ?, updated_at = ?
          WHERE id = ?`
      )
        .bind(
          payload.day,
          payload.personId,
          payload.area,
          payload.title,
          payload.position,
          new Date().toISOString(),
          id
        )
        .run();
      return json({ task: await fetchCleaningTask(env, id) });
    }

    if (request.method === "DELETE") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM cleaning_checks WHERE task_id = ?").bind(id),
        env.DB.prepare("DELETE FROM cleaning_tasks WHERE id = ?").bind(id),
      ]);
      return json({ ok: true });
    }
  }

  throw new HttpError(405, "Método no permitido");
}

const CALENDAR_SELECT = `SELECT c.*, p.name AS person_name, p.tone AS person_tone,
       p.initials AS person_initials
  FROM calendars c
  LEFT JOIN people p ON p.id = c.person_id`;

async function fetchCalendarRow(env, id) {
  const row = await env.DB.prepare(`${CALENDAR_SELECT} WHERE c.id = ?`)
    .bind(id)
    .first();
  if (!row) throw new HttpError(404, "Calendario no encontrado");
  return rowToCalendar(row);
}

async function ensureDefaultCalendar(env) {
  const seeded = await env.DB.prepare(
    "SELECT value FROM app_meta WHERE key = 'calendars_seeded'"
  ).first();
  if (seeded) return;

  const now = new Date().toISOString();
  if (env.ICLOUD_ICS_URL) {
    try {
      const url = normalizeCalendarUrl(env.ICLOUD_ICS_URL);
      await env.DB.prepare(
        `INSERT OR IGNORE INTO calendars
          (id, name, url, color, person_id, active, last_sync_at, last_error,
           created_at, updated_at)
         VALUES ('casa', 'Casa', ?, 'ink', NULL, 1, NULL, NULL, ?, ?)`
      )
        .bind(url, now, now)
        .run();
    } catch {
      // Si la variable de entorno no es un ICS válido, la app sigue
      // arrancando y el usuario puede añadir el calendario desde la agenda.
    }
  }
  await env.DB.prepare(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('calendars_seeded', ?)"
  )
    .bind(now)
    .run();
}

function calendarPayload(env, body, existing = null) {
  const name =
    body.name === undefined
      ? existing
        ? existing.name
        : ""
      : normalizeLabel(body.name, "El nombre del calendario", 60);
  const url =
    body.url === undefined
      ? existing
        ? existing.url
        : ""
      : normalizeCalendarUrl(body.url);
  const color = Object.prototype.hasOwnProperty.call(body, "color")
    ? normalizeTone(body.color, existing ? existing.color : "lilac")
    : existing
      ? existing.color
      : "lilac";
  const active =
    body.active === undefined
      ? existing
        ? Boolean(existing.active)
        : true
      : Boolean(body.active);
  return { name, url, color, active };
}

async function handleCalendars(request, env, url) {
  requireDashboard(request, env);
  await ensureDefaultCalendar(env);

  if (url.pathname === "/api/calendars" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      `${CALENDAR_SELECT} ORDER BY c.created_at ASC, c.name ASC`
    ).all();
    return json({ calendars: (results || []).map(rowToCalendar) });
  }

  if (url.pathname === "/api/calendars" && request.method === "POST") {
    const body = await readJson(request);
    const payload = calendarPayload(env, body);
    const person = await getPerson(env, body.personId);

    const duplicate = await env.DB.prepare(
      "SELECT id FROM calendars WHERE url = ?"
    )
      .bind(payload.url)
      .first();
    if (duplicate) {
      throw new HttpError(409, "Ese calendario ya está añadido");
    }

    const id = `cal-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO calendars
        (id, name, url, color, person_id, active, last_sync_at, last_error,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`
    )
      .bind(
        id,
        payload.name,
        payload.url,
        payload.color,
        person ? person.id : null,
        payload.active ? 1 : 0,
        now,
        now
      )
      .run();
    return json({ calendar: await fetchCalendarRow(env, id) }, 201);
  }

  const syncMatch = url.pathname.match(
    /^\/api\/calendars\/([a-z0-9_-]+)\/sync$/
  );
  if (syncMatch && request.method === "POST") {
    const calendar = await fetchCalendarRow(env, syncMatch[1]);
    const days = parseInteger(url.searchParams.get("days"), 14, 1, 60);
    try {
      const result = await getCalendarEvents(calendar.url, days, {
        force: true,
      });
      await env.DB.prepare(
        "UPDATE calendars SET last_sync_at = ?, last_error = NULL, updated_at = ? WHERE id = ?"
      )
        .bind(result.fetchedAt, new Date().toISOString(), calendar.id)
        .run();
      return json({
        ok: true,
        calendar: await fetchCalendarRow(env, calendar.id),
        eventCount: result.events.length,
      });
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : "No se pudo leer el calendario";
      await env.DB.prepare(
        "UPDATE calendars SET last_error = ?, updated_at = ? WHERE id = ?"
      )
        .bind(message, new Date().toISOString(), calendar.id)
        .run();
      throw new HttpError(502, message, "calendar_fetch_failed");
    }
  }

  const match = url.pathname.match(/^\/api\/calendars\/([a-z0-9_-]+)$/);
  if (match) {
    const id = match[1];
    const existing = await fetchCalendarRow(env, id);

    if (request.method === "PATCH") {
      const body = await readJson(request);
      const payload = calendarPayload(env, body, existing);
      const hasPerson = Object.prototype.hasOwnProperty.call(body, "personId");
      const person = hasPerson
        ? await getPerson(env, body.personId)
        : existing.person;

      const duplicate = await env.DB.prepare(
        "SELECT id FROM calendars WHERE url = ? AND id != ?"
      )
        .bind(payload.url, id)
        .first();
      if (duplicate) {
        throw new HttpError(409, "Ese calendario ya está añadido");
      }

      await env.DB.prepare(
        `UPDATE calendars
            SET name = ?, url = ?, color = ?, person_id = ?, active = ?,
                last_error = NULL, updated_at = ?
          WHERE id = ?`
      )
        .bind(
          payload.name,
          payload.url,
          payload.color,
          person ? person.id : null,
          payload.active ? 1 : 0,
          new Date().toISOString(),
          id
        )
        .run();
      return json({ calendar: await fetchCalendarRow(env, id) });
    }

    if (request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM calendars WHERE id = ?")
        .bind(id)
        .run();
      return json({ ok: true });
    }
  }

  throw new HttpError(405, "Método no permitido");
}

function registerTimezones(root) {
  const timezones = root.getAllSubcomponents("vtimezone");
  timezones.forEach((timezone) => {
    try {
      const tzid = timezone.getFirstPropertyValue("tzid");
      if (tzid && !ICAL.TimezoneService.has(tzid)) {
        ICAL.TimezoneService.register(timezone);
      }
    } catch {
      // Si una zona del feed no se puede registrar, el resto sigue funcionando.
    }
  });
}

function icalDateString(time) {
  return `${String(time.year).padStart(4, "0")}-${String(time.month).padStart(
    2,
    "0"
  )}-${String(time.day).padStart(2, "0")}`;
}

function icalTimeKey(time) {
  if (!time) return "";
  if (time.isDate) return `D:${icalDateString(time)}`;
  return `T:${time.toJSDate().getTime()}`;
}

function addOneDayToDateString(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${String(next.getUTCFullYear()).padStart(4, "0")}-${String(
    next.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function normalizeIcsUrl(raw) {
  if (raw.startsWith("webcal://")) return `https://${raw.slice(9)}`;
  return raw;
}

function occurrenceToEvent(details, uid, isException = false) {
  const start = details.startDate;
  const end = details.endDate;
  const allDay = Boolean(start.isDate);
  const startDate = start.toJSDate();
  let endDate = end ? end.toJSDate() : new Date(startDate.getTime() + 60 * 60 * 1000);

  if (allDay) {
    if (endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    }
  } else if (endDate <= startDate) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  const startValue = allDay ? icalDateString(start) : startDate.toISOString();
  let endValue;
  if (allDay) {
    endValue = icalDateString(end || start);
    // DTEND de un evento de día completo es exclusivo. Si falta o coincide
    // con el inicio, el evento dura al menos un día.
    if (endValue <= startValue) endValue = addOneDayToDateString(startValue);
  } else {
    endValue = endDate.toISOString();
  }

  return {
    id: `${uid}::${startValue}${isException ? "::x" : ""}`,
    uid,
    summary: details.item ? details.item.summary : "",
    location: details.item ? details.item.location : "",
    start: startValue,
    end: endValue,
    allDay,
  };
}

async function fetchCalendarFeed(icsUrl) {
  const response = await fetch(normalizeIcsUrl(icsUrl), {
    headers: {
      Accept: "text/calendar, text/plain;q=0.8",
      "User-Agent": "BBDSDashboard/1.0",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new HttpError(
      502,
      `El calendario respondió ${response.status} al descargar el ICS`,
      "calendar_fetch_failed"
    );
  }

  return response.text();
}

async function getCalendarEvents(icsUrl, days, { force = false } = {}) {
  const cacheKey = `days:${days}:${icsUrl}`;
  const cached = calendarCache.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) {
    return {
      events: cached.events,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
    };
  }

  const text = await fetchCalendarFeed(icsUrl);
  const root = new ICAL.Component(ICAL.parse(text));
  registerTimezones(root);

  const components = root.getAllSubcomponents("vevent");
  const now = new Date();
  const rangeStart = new Date(now.getTime() - 60 * 60 * 1000);
  const rangeEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const exceptions = new Map();
  components.forEach((component) => {
    const recurrenceId = component.getFirstPropertyValue("recurrence-id");
    const uid = String(component.getFirstPropertyValue("uid") || "");
    if (recurrenceId && uid) {
      exceptions.set(`${uid}|${icalTimeKey(recurrenceId)}`, component);
    }
  });

  const events = [];
  const seen = new Set();

  function pushEvent(event) {
    const start = event.allDay
      ? new Date(`${event.start}T00:00:00`)
      : new Date(event.start);
    const end = event.allDay
      ? new Date(`${event.end}T00:00:00`)
      : new Date(event.end);
    if (end <= rangeStart || start >= rangeEnd) return;
    if (seen.has(event.id)) return;
    seen.add(event.id);
    events.push(event);
  }

  components.forEach((component) => {
    const uid = String(component.getFirstPropertyValue("uid") || "");
    if (!uid) return;
    const recurrenceId = component.getFirstPropertyValue("recurrence-id");
    const event = new ICAL.Event(component);

    if (recurrenceId) {
      // Las excepciones se añaden aparte; su hora puede haber cambiado.
      const start = event.startDate;
      const end = event.endDate;
      if (!start) return;
      const details = {
        startDate: start,
        endDate: end || start,
        item: event,
      };
      pushEvent(occurrenceToEvent(details, uid, true));
      return;
    }

    if (event.isRecurring()) {
      let iterator;
      try {
        iterator = event.iterator(event.startDate);
      } catch {
        return;
      }
      let next = iterator.next();
      let iterations = 0;
      while (next && iterations < 12000) {
        iterations += 1;
        const occurrenceStart = next.toJSDate();
        if (occurrenceStart >= rangeEnd) break;
        const key = `${uid}|${icalTimeKey(next)}`;
        if (!exceptions.has(key)) {
          try {
            const details = event.getOccurrenceDetails(next);
            const end = details.endDate
              ? details.endDate.toJSDate()
              : new Date(occurrenceStart.getTime() + 60 * 60 * 1000);
            if (end > rangeStart) {
              pushEvent(occurrenceToEvent(details, uid));
            }
          } catch {
            // Una recurrencia rota no debe tumbar el calendario entero.
          }
        }
        next = iterator.next();
      }
      return;
    }

    if (!event.startDate) return;
    const details = {
      startDate: event.startDate,
      endDate: event.endDate || event.startDate,
      item: event,
    };
    pushEvent(occurrenceToEvent(details, uid));
  });

  events.sort((a, b) => {
    const aDate = a.allDay ? new Date(`${a.start}T00:00:00`) : new Date(a.start);
    const bDate = b.allDay ? new Date(`${b.start}T00:00:00`) : new Date(b.start);
    return aDate - bDate;
  });

  const limited = events.slice(0, 80);
  const fetchedAt = new Date().toISOString();
  calendarCache.set(cacheKey, {
    events: limited,
    fetchedAt,
    expiresAt: Date.now() + CALENDAR_CACHE_MS,
  });
  if (calendarCache.size > 20) {
    const oldestKey = calendarCache.keys().next().value;
    calendarCache.delete(oldestKey);
  }
  return { events: limited, fetchedAt, fromCache: false };
}

async function handleCalendar(request, env, url) {
  requireDashboard(request, env);
  await ensureDefaultCalendar(env);

  const days = parseInteger(url.searchParams.get("days"), 14, 1, 60);
  const { results } = await env.DB.prepare(
    `${CALENDAR_SELECT} WHERE c.active = 1 ORDER BY c.created_at ASC, c.name ASC`
  ).all();
  const calendars = (results || []).map(rowToCalendar);

  if (!calendars.length) {
    throw new HttpError(
      503,
      "No hay calendarios configurados. Añade uno desde la agenda.",
      "calendar_not_configured"
    );
  }

  const now = new Date();
  const outcomes = await Promise.all(
    calendars.map(async (calendar) => {
      const cacheKey = `days:${days}:${calendar.url}`;
      try {
        const result = await getCalendarEvents(calendar.url, days);
        if (!result.fromCache) {
          await env.DB.prepare(
            "UPDATE calendars SET last_sync_at = ?, last_error = NULL, updated_at = ? WHERE id = ?"
          )
            .bind(
              result.fetchedAt,
              new Date().toISOString(),
              calendar.id
            )
            .run();
        }
        return {
          calendar,
          events: result.events,
          syncedAt: result.fetchedAt,
          error: null,
        };
      } catch (error) {
        const message =
          error instanceof HttpError
            ? error.message
            : "No se pudo leer el calendario";
        const stale = calendarCache.get(cacheKey);
        await env.DB.prepare(
          "UPDATE calendars SET last_error = ?, updated_at = ? WHERE id = ?"
        )
          .bind(message, new Date().toISOString(), calendar.id)
          .run();
        return {
          calendar,
          events: stale ? stale.events : [],
          syncedAt: stale ? stale.fetchedAt : null,
          error: message,
        };
      }
    })
  );

  const events = [];
  const feeds = outcomes.map(
    ({ calendar, events: feedEvents, syncedAt, error }) => {
      feedEvents.forEach((event) => {
        events.push({
          ...event,
          id: `${calendar.id}::${event.id}`,
          calendarId: calendar.id,
          calendarName: calendar.name,
          calendarColor: calendar.color,
          personId: calendar.personId,
          personName: calendar.person ? calendar.person.name : null,
          personTone: calendar.person ? calendar.person.tone : null,
        });
      });

      const lastSyncAt = syncedAt || calendar.lastSyncAt;
      const age = lastSyncAt ? now.getTime() - Date.parse(lastSyncAt) : Infinity;
      return {
        id: calendar.id,
        name: calendar.name,
        color: calendar.color,
        personId: calendar.personId,
        person: calendar.person,
        active: calendar.active,
        lastSyncAt,
        lastError: error || null,
        eventCount: feedEvents.length,
        stale: Boolean(error) || age > CALENDAR_STALE_MS,
      };
    }
  );

  events.sort((a, b) => {
    const aDate = a.allDay ? new Date(`${a.start}T00:00:00`) : new Date(a.start);
    const bDate = b.allDay ? new Date(`${b.start}T00:00:00`) : new Date(b.start);
    return aDate - bDate;
  });

  return json(
    {
      events: events.slice(0, 120),
      feeds,
      updatedAt: new Date().toISOString(),
      days,
      configured: true,
    },
    200,
    { "Cache-Control": "private, max-age=60" }
  );
}

async function route(request, env, url) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Sensor-Token",
      },
    });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      ok: true,
      calendarConfigured: Boolean(env.ICLOUD_ICS_URL),
      dashboardProtected: Boolean(env.DASHBOARD_TOKEN),
      sensorProtected: Boolean(env.SENSOR_TOKEN),
      cleaning: true,
      calendars: true,
      electricity: true,
      electricitySource: "PVPC 2.0 TD",
    });
  }

  if (url.pathname === "/api/electricity" && request.method === "GET") {
    return handleElectricity(request, env);
  }

  if (
    url.pathname === "/api/sensors" ||
    url.pathname === "/api/sensors/latest" ||
    url.pathname === "/api/sensors/history"
  ) {
    return handleSensors(request, env, url);
  }

  if (
    url.pathname === "/api/lists" ||
    /^\/api\/lists\/\d+$/.test(url.pathname)
  ) {
    return handleLists(request, env, url);
  }

  if (
    url.pathname === "/api/people" ||
    /^\/api\/people\/[a-z0-9_-]+$/.test(url.pathname)
  ) {
    return handlePeople(request, env, url);
  }

  if (
    url.pathname === "/api/cleaning" ||
    url.pathname === "/api/cleaning/checks" ||
    url.pathname === "/api/cleaning/reset" ||
    url.pathname === "/api/cleaning/tasks" ||
    /^\/api\/cleaning\/tasks\/[a-z0-9_-]+$/.test(url.pathname)
  ) {
    return handleCleaning(request, env, url);
  }

  if (
    url.pathname === "/api/calendars" ||
    /^\/api\/calendars\/[a-z0-9_-]+$/.test(url.pathname) ||
    /^\/api\/calendars\/[a-z0-9_-]+\/sync$/.test(url.pathname)
  ) {
    return handleCalendars(request, env, url);
  }

  if (url.pathname === "/api/calendar" && request.method === "GET") {
    return handleCalendar(request, env, url);
  }

  throw new HttpError(404, "Ruta de API no encontrada");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    try {
      return await route(request, env, url);
    } catch (error) {
      if (error instanceof HttpError) {
        return json(
          { error: error.message, code: error.code },
          error.status
        );
      }
      console.error("BBDS API error", error);
      return json(
        { error: "Error interno del servidor", code: "internal_error" },
        500
      );
    }
  },
};
