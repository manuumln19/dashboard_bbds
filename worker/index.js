import ICAL from "ical.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const LIST_IDS = new Set(["shopping", "tasks"]);
const CALENDAR_CACHE_MS = 5 * 60 * 1000;
let calendarCache = null;

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

async function handleLists(request, env, url) {
  requireDashboard(request, env);

  if (url.pathname === "/api/lists") {
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT id, list_id, text, drawing, done, created_at, updated_at
         FROM list_items
         ORDER BY created_at ASC, id ASC`
      ).all();
      return json({ items: (results || []).map(rowToListItem) });
    }

    if (request.method === "POST") {
      const body = await readJson(request);
      const listId = String(body.listId || "");
      const text = normalizeText(body.text);
      const drawing = normalizeDrawing(body.drawing);

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

      const finalText = text || "Nota manuscrita";
      const now = new Date().toISOString();
      const result = await env.DB.prepare(
        `INSERT INTO list_items (list_id, text, drawing, done, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)`
      )
        .bind(listId, finalText, drawing, now, now)
        .run();

      return json(
        {
          item: {
            id: result.meta.last_row_id,
            listId,
            text: finalText,
            drawing,
            done: false,
            createdAt: now,
            updatedAt: now,
          },
        },
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
      if (!hasDone && !hasText) {
        throw new HttpError(400, "Nada que actualizar");
      }

      let text = null;
      if (hasText) {
        text = normalizeText(body.text);
        if (!text) throw new HttpError(400, "El texto no puede estar vacío");
        if (text.length > 160) {
          throw new HttpError(400, "El texto no puede pasar de 160 caracteres");
        }
      }

      await env.DB.prepare(
        `UPDATE list_items
         SET done = COALESCE(?, done),
             text = COALESCE(?, text),
             updated_at = ?
         WHERE id = ?`
      )
        .bind(hasDone ? (body.done ? 1 : 0) : null, text, new Date().toISOString(), id)
        .run();

      const row = await env.DB.prepare(
        `SELECT id, list_id, text, drawing, done, created_at, updated_at
         FROM list_items WHERE id = ?`
      )
        .bind(id)
        .first();

      if (!row) throw new HttpError(404, "Elemento no encontrado");
      return json({ item: rowToListItem(row) });
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

async function fetchCalendar(icsUrl) {
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
      `iCloud respondió ${response.status} al descargar el calendario`,
      "calendar_fetch_failed"
    );
  }

  return response.text();
}

async function getCalendarEvents(icsUrl, days) {
  const cacheKey = `days:${days}:${icsUrl}`;
  if (
    calendarCache &&
    calendarCache.key === cacheKey &&
    calendarCache.expiresAt > Date.now()
  ) {
    return calendarCache.events;
  }

  const text = await fetchCalendar(icsUrl);
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
  calendarCache = {
    key: cacheKey,
    events: limited,
    expiresAt: Date.now() + CALENDAR_CACHE_MS,
  };
  return limited;
}

async function handleCalendar(request, env, url) {
  requireDashboard(request, env);
  if (!env.ICLOUD_ICS_URL) {
    throw new HttpError(
      503,
      "Falta configurar el enlace ICS del calendario",
      "calendar_not_configured"
    );
  }

  const days = parseInteger(url.searchParams.get("days"), 14, 1, 60);
  const events = await getCalendarEvents(env.ICLOUD_ICS_URL, days);

  return json(
    {
      events,
      updatedAt: new Date().toISOString(),
      days,
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
    });
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
