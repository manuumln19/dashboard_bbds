import { formatAge } from "./date.js";
import { dateFormat, numberFormat } from "./intl.js";

// Todo el cálculo vive aquí, sin DOM ni APIs del navegador, para poder
// verificarlo con `npm run check:energy`. Las horas se interpretan siempre
// en Europe/Madrid, también en los cambios de hora.

export const PRICE_TIMEZONE = "Europe/Madrid";
export const HOUR_MS = 60 * 60 * 1000;
// Una franja que empieza en la hora actual solo se ofrece si aún quedan
// al menos 30 minutos. Si no, se empieza a contar desde la hora siguiente.
export const MIN_REMAINING_MS = 30 * 60 * 1000;
export const TAX_RATES = { iee: 0.0511, iva: 0.21 };

const zonedFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: PRICE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const FLEXIBILITY_OPTIONS = [
  { hours: 0, label: "Ahora" },
  { hours: 2, label: "2 h" },
  { hours: 4, label: "4 h" },
  { hours: 8, label: "8 h" },
  { hours: 24, label: "Todo el día" },
];

export const PRICE_BANDS = {
  cheap: { id: "cheap", label: "Barata", short: "Barata" },
  mid: { id: "mid", label: "Media", short: "Media" },
  high: { id: "high", label: "Cara", short: "Cara" },
};

export const APPLIANCES = [
  {
    id: "washer",
    name: "Lavadora",
    icon: "washer",
    mode: "cycle",
    defaultHours: 2,
    defaultConsumption: 1.2,
    minHours: 1,
    maxHours: 4,
    minConsumption: 0.3,
    maxConsumption: 3,
    stepConsumption: 0.1,
    consumptionLabel: "Consumo del ciclo",
    hint: "Programa eco 40–60 °C",
  },
  {
    id: "heater",
    name: "Termo eléctrico",
    icon: "heater",
    mode: "hourly",
    defaultHours: 2,
    defaultConsumption: 2,
    minHours: 1,
    maxHours: 6,
    minConsumption: 0.2,
    maxConsumption: 4,
    stepConsumption: 0.1,
    consumptionLabel: "Consumo por hora",
    hint: "2 kWh por hora de resistencia",
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Los mismos instantes (horas de la tarifa) se consultan muchas veces por
// render, y formatToParts es lento en el WebView del marco.
const zonedCache = new Map();

export function zonedParts(date) {
  const time = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const hit = zonedCache.get(time);
  if (hit) return { ...hit };
  const result = computeZonedParts(time);
  if (zonedCache.size > 512) zonedCache.clear();
  zonedCache.set(time, result);
  return { ...result };
}

function computeZonedParts(date) {
  const parts = zonedFormatter.formatToParts(date);
  const result = {};
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.type !== "literal") result[part.type] = part.value;
  }
  // Algunos motores devuelven 24 para medianoche; lo normalizamos a 00.
  if (result.hour === "24") result.hour = "00";
  return result;
}

export function madridDateKey(date = new Date()) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function madridHour(date = new Date()) {
  return Number(zonedParts(date).hour);
}

export function addDaysKey(key, days) {
  const [year, month, day] = String(key).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Convierte una hora local de Madrid a un instante UTC. Se usa solo en los
// datos de demo; los datos reales ya traen su offset.
export function zonedDateTimeToUtc(dateKey, hour) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, 0, 0);
  let stamp = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(new Date(stamp));
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    const difference = asUtc - target;
    if (difference === 0) break;
    stamp -= difference;
  }
  return new Date(stamp);
}

export function dayKeyToDate(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatDayShort(key) {
  if (!key) return "";
  return dateFormat({
    timeZone: PRICE_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(dayKeyToDate(key))
    .replace(/\./g, "")
    .replace(/,/g, "");
}

export function dayLabel(key, now = new Date()) {
  if (!key) return "";
  const todayKey = madridDateKey(now);
  if (key === todayKey) return "Hoy";
  if (key === addDaysKey(todayKey, 1)) return "Mañana";
  if (key === addDaysKey(todayKey, -1)) return "Ayer";
  return formatDayShort(key);
}

export function formatHour(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  const value = dateFormat({
    timeZone: PRICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return value.replace(/^24/, "00");
}

function wallClockMinutes(date) {
  const parts = zonedParts(date);
  return (
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    ) / 60000
  );
}

export function formatWindow(startIso, durationHours) {
  if (!startIso) return "—";
  const start = new Date(startIso);
  if (!Number.isFinite(start.getTime())) return "—";
  const end = new Date(start.getTime() + durationHours * HOUR_MS);
  const label = `${formatHour(start.toISOString())}–${formatHour(end.toISOString())}`;
  // En los cambios de hora, la hora de pared puede saltar o repetirse. Se
  // añade la duración real para que «01:00–04:00» no parezca un programa de
  // tres horas cuando son dos.
  const wallSpan = wallClockMinutes(end) - wallClockMinutes(start);
  if (Math.round(wallSpan) !== Math.round(durationHours * 60)) {
    return `${label} · ${durationHours} h`;
  }
  return label;
}

export function formatUpdatedStamp(value) {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sin datos";
  return dateFormat({
    timeZone: PRICE_TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatUpdatedAge(value, now = new Date()) {
  if (!value) return "";
  return formatAge(value, now).toLowerCase();
}

function isMissing(value) {
  return value === null || value === undefined || value === "";
}

function asNumber(value) {
  return isMissing(value) ? NaN : Number(value);
}

export function formatPrice(value) {
  const price = asNumber(value);
  if (!Number.isFinite(price)) return "—";
  return numberFormat({
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(price);
}

export function formatMoney(value) {
  const amount = asNumber(value);
  if (!Number.isFinite(amount)) return "—";
  const digits = Math.abs(amount) > 0 && Math.abs(amount) < 0.1 ? 3 : 2;
  return numberFormat({
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatConsumption(value) {
  const amount = asNumber(value);
  if (!Number.isFinite(amount)) return "—";
  return `${numberFormat({
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount)} kWh`;
}

export function formatPercent(value) {
  const ratio = asNumber(value);
  if (!Number.isFinite(ratio)) return "—";
  return `${numberFormat({
    maximumFractionDigits: 0,
  }).format(ratio * 100)} %`;
}

export function applianceById(id) {
  for (let index = 0; index < APPLIANCES.length; index += 1) {
    if (APPLIANCES[index].id === id) return APPLIANCES[index];
  }
  return APPLIANCES[0];
}

export function defaultConfigFor(appliance) {
  return {
    durationHours: appliance.defaultHours,
    consumption: appliance.defaultConsumption,
    flexibilityHours: 4,
  };
}

export function normalizeApplianceConfig(appliance, raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const defaultConfig = defaultConfigFor(appliance);
  const duration = Number(source.durationHours);
  const consumption = Number(source.consumption);
  const flexibility = Number(source.flexibilityHours);

  const durationHours = clamp(
    Number.isFinite(duration) ? Math.round(duration) : defaultConfig.durationHours,
    appliance.minHours,
    appliance.maxHours
  );
  const safeConsumption = clamp(
    Number.isFinite(consumption)
      ? roundTo(consumption, 1)
      : defaultConfig.consumption,
    appliance.minConsumption,
    appliance.maxConsumption
  );
  const flexibilityHours = [0, 2, 4, 8, 24].includes(flexibility)
    ? flexibility
    : defaultConfig.flexibilityHours;

  return { durationHours, consumption: safeConsumption, flexibilityHours };
}

export function consumptionKwh(appliance, config) {
  if (!appliance || !config) return 0;
  if (appliance.mode === "hourly") {
    return roundTo(config.consumption * config.durationHours, 2);
  }
  return roundTo(config.consumption, 2);
}

export function findDay(payload, dateKey) {
  if (!payload || !Array.isArray(payload.days)) return null;
  for (let index = 0; index < payload.days.length; index += 1) {
    if (payload.days[index].date === dateKey) return payload.days[index];
  }
  return null;
}

export function latestDay(payload) {
  if (!payload || !Array.isArray(payload.days) || !payload.days.length) {
    return null;
  }
  const sorted = payload.days.slice().sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );
  return sorted[sorted.length - 1];
}

export function classifyPriceBands(day) {
  if (!day || !Array.isArray(day.hours) || !day.hours.length) return null;

  const prices = [];
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let minHour = null;
  let maxHour = null;

  for (let index = 0; index < day.hours.length; index += 1) {
    const slot = day.hours[index];
    const price = Number(slot.price);
    if (!Number.isFinite(price)) continue;
    prices.push(price);
    sum += price;
    if (price < min) {
      min = price;
      minHour = slot;
    }
    if (price > max) {
      max = price;
      maxHour = slot;
    }
  }

  if (!prices.length) return null;

  const sorted = prices.slice().sort((a, b) => a - b);
  const quantile = (ratio) =>
    sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
  const low = quantile(1 / 3);
  const high = quantile(2 / 3);
  const degenerate = max - min < 0.00001;

  return {
    min,
    max,
    avg: sum / prices.length,
    low,
    high,
    degenerate,
    minHour,
    maxHour,
    count: prices.length,
  };
}

export function bandForPrice(price, bands) {
  if (isMissing(price) || !Number.isFinite(Number(price))) {
    return { ...PRICE_BANDS.mid };
  }
  if (!bands || bands.degenerate) return { ...PRICE_BANDS.mid };
  if (Math.abs(bands.high - bands.low) < 0.00001) {
    return { ...PRICE_BANDS.mid };
  }
  if (Number(price) <= bands.low + 0.00001) return { ...PRICE_BANDS.cheap };
  if (Number(price) >= bands.high - 0.00001) return { ...PRICE_BANDS.high };
  return { ...PRICE_BANDS.mid };
}

export function bandCounts(day, bands) {
  const counts = { cheap: 0, mid: 0, high: 0 };
  if (!day || !Array.isArray(day.hours)) return counts;
  for (let index = 0; index < day.hours.length; index += 1) {
    const band = bandForPrice(day.hours[index].price, bands);
    counts[band.id] += 1;
  }
  return counts;
}

export function findCurrentSlot(day, now = new Date()) {
  if (!day || !Array.isArray(day.hours)) return null;
  const stamp = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(stamp)) return null;
  for (let index = 0; index < day.hours.length; index += 1) {
    const slot = day.hours[index];
    const start = Date.parse(slot.start);
    if (Number.isFinite(start) && stamp >= start && stamp < start + HOUR_MS) {
      return slot;
    }
  }
  return null;
}

export function findNextSlot(day, now = new Date()) {
  if (!day || !Array.isArray(day.hours)) return null;
  const stamp = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(stamp)) return null;
  for (let index = 0; index < day.hours.length; index += 1) {
    const slot = day.hours[index];
    const start = Date.parse(slot.start);
    if (Number.isFinite(start) && start > stamp) return slot;
  }
  return null;
}

export function isPastSlot(slot, now = new Date()) {
  if (!slot) return false;
  const start = Date.parse(slot.start);
  const stamp = now instanceof Date ? now.getTime() : Number(now);
  return Number.isFinite(start) && start + HOUR_MS <= stamp;
}

// Resume si los precios cubren la hora actual, la siguiente o solo el
// último día disponible. La vista nunca debe presentar una copia antigua
// como si fuera el precio de ahora.
export function currentPriceState(payload, now = new Date()) {
  const todayKey = madridDateKey(now);
  const today = findDay(payload, todayKey);
  if (today) {
    const current = findCurrentSlot(today, now);
    if (current) {
      return { status: "current", day: today, date: todayKey, slot: current };
    }
    const next = findNextSlot(today, now);
    if (next) {
      return { status: "upcoming", day: today, date: todayKey, slot: next };
    }
    return { status: "ended", day: today, date: todayKey, slot: null };
  }
  return {
    status: "missing",
    day: null,
    date: todayKey,
    slot: null,
    latest: latestDay(payload),
  };
}

export function formatPriceUnit(value) {
  const price = formatPrice(value);
  return price === "—" ? price : `${price} €/kWh`;
}

export function windowFor(hours, startIndex, appliance, config) {
  const duration = Math.max(1, Math.round(config.durationHours));
  if (
    !Array.isArray(hours) ||
    startIndex < 0 ||
    startIndex + duration > hours.length
  ) {
    return null;
  }

  const firstStart = Date.parse(hours[startIndex].start);
  if (!Number.isFinite(firstStart)) return null;

  for (let offset = 1; offset < duration; offset += 1) {
    const previous = Date.parse(hours[startIndex + offset - 1].start);
    const current = Date.parse(hours[startIndex + offset].start);
    if (
      !Number.isFinite(previous) ||
      !Number.isFinite(current) ||
      current - previous !== HOUR_MS
    ) {
      return null;
    }
  }

  const hourlyConsumption =
    appliance.mode === "hourly"
      ? config.consumption
      : config.consumption / duration;

  let cost = 0;
  let priceSum = 0;
  for (let offset = 0; offset < duration; offset += 1) {
    const price = Number(hours[startIndex + offset].price);
    if (!Number.isFinite(price)) return null;
    cost += hourlyConsumption * price;
    priceSum += price;
  }

  return {
    startIndex,
    endIndex: startIndex + duration,
    start: hours[startIndex].start,
    end: new Date(firstStart + duration * HOUR_MS).toISOString(),
    cost,
    averagePrice: priceSum / duration,
    kwh: consumptionKwh(appliance, config),
    durationHours: duration,
  };
}

export function computeRecommendations({
  day,
  now = new Date(),
  appliance,
  config,
  fromStart = false,
}) {
  const duration = Math.max(1, Math.round(config.durationHours));
  const kwh = consumptionKwh(appliance, config);
  const base = {
    available: false,
    options: [],
    best: null,
    immediate: null,
    immediateIsNow: false,
    savings: null,
    savingsPct: null,
    reason: null,
    durationHours: duration,
    flexibilityHours: Number(config.flexibilityHours),
    kwh,
    evaluated: 0,
  };

  if (!day || !Array.isArray(day.hours) || !day.hours.length) {
    return { ...base, reason: "No hay precios disponibles para este día." };
  }

  const hours = day.hours;
  if (hours.length < duration) {
    return {
      ...base,
      reason: `Hay ${hours.length} h de precio y el programa necesita ${duration} h.`,
    };
  }

  const stamp = now instanceof Date ? now.getTime() : Number(now);
  const currentIndex = fromStart
    ? -1
    : hours.findIndex((slot) => {
        const start = Date.parse(slot.start);
        return (
          Number.isFinite(start) && stamp >= start && stamp < start + HOUR_MS
        );
      });

  // La primera franja viable es también la referencia de "lo antes posible".
  // Si a la hora actual le quedan menos de 30 minutos, se empieza en la
  // siguiente: el programa completo necesita horas enteras.
  let firstIndex = -1;
  let immediateIsNow = false;
  if (fromStart) {
    firstIndex = 0;
  } else if (currentIndex >= 0) {
    const start = Date.parse(hours[currentIndex].start);
    const remaining = start + HOUR_MS - stamp;
    if (remaining >= MIN_REMAINING_MS) {
      firstIndex = currentIndex;
      immediateIsNow = true;
    } else {
      firstIndex = currentIndex + 1;
    }
  } else {
    firstIndex = hours.findIndex((slot) => Date.parse(slot.start) > stamp);
  }

  if (firstIndex < 0 || firstIndex >= hours.length) {
    return {
      ...base,
      reason: "Ya no quedan horas de precio hoy para completar este programa.",
    };
  }

  if (hours.length - firstIndex < duration) {
    return {
      ...base,
      reason: `Solo quedan ${hours.length - firstIndex} h de precio y el programa necesita ${duration} h.`,
    };
  }

  const flexibility = Number(config.flexibilityHours);
  let lastIndex;
  if (fromStart || flexibility >= 24) {
    lastIndex = hours.length - duration;
  } else if (flexibility <= 0) {
    lastIndex = firstIndex;
  } else {
    lastIndex = Math.min(
      hours.length - duration,
      firstIndex + flexibility - 1
    );
  }

  const candidates = [];
  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const window = windowFor(hours, index, appliance, config);
    if (window) candidates.push(window);
  }

  if (!candidates.length) {
    return {
      ...base,
      reason:
        "Los precios tienen huecos y no hay una franja completa disponible.",
    };
  }

  candidates.sort((a, b) => a.cost - b.cost || a.startIndex - b.startIndex);

  // Las alternativas no se solapan: si dos franjas comparten horas, la
  // segunda no aporta una opción distinta al usuario.
  const options = [];
  for (let index = 0; index < candidates.length; index += 1) {
    if (options.length >= 8) break;
    const candidate = candidates[index];
    let overlaps = false;
    for (let other = 0; other < options.length; other += 1) {
      const chosen = options[other];
      if (
        candidate.startIndex < chosen.endIndex &&
        candidate.endIndex > chosen.startIndex
      ) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) options.push(candidate);
  }

  const best = options[0];
  const immediate =
    fromStart || firstIndex < 0
      ? null
      : windowFor(hours, firstIndex, appliance, config);
  const savings = immediate ? immediate.cost - best.cost : null;
  const savingsPct =
    immediate && immediate.cost > 0.0000001 ? savings / immediate.cost : null;

  return {
    available: true,
    options,
    best,
    immediate,
    immediateIsNow,
    savings,
    savingsPct,
    reason: null,
    durationHours: duration,
    flexibilityHours: flexibility,
    kwh,
    evaluated: candidates.length,
  };
}

export function bestWindowOfDay(day, appliance, config) {
  if (!day || !Array.isArray(day.hours) || !day.hours.length) {
    return null;
  }
  const result = computeRecommendations({
    day,
    now: new Date(day.hours[0].start),
    appliance,
    config,
    fromStart: true,
  });
  return result.available ? result.best : null;
}

// Resumen para la tarjeta de Inicio: la mejor franja restante de cada aparato.
// Si hoy ya no cabe el programa completo, se muestra la mejor de mañana y se
// marca el día para que nunca parezca una franja de hoy.
export function applianceWindows(payload, now, configs = {}) {
  const todayKey = madridDateKey(now);
  const today = findDay(payload, todayKey);
  const tomorrow = findDay(payload, addDaysKey(todayKey, 1));

  return APPLIANCES.map((appliance) => {
    const config = normalizeApplianceConfig(appliance, configs[appliance.id]);
    let best = null;
    let day = null;

    if (today) {
      const result = computeRecommendations({
        day: today,
        now,
        appliance,
        config,
      });
      if (result.available) {
        best = result.best;
        day = "today";
      }
    }

    if (!best && tomorrow) {
      const tomorrowBest = bestWindowOfDay(tomorrow, appliance, config);
      if (tomorrowBest) {
        best = tomorrowBest;
        day = "tomorrow";
      }
    }

    return { appliance, config, day, best };
  });
}

export function taxBreakdown(cost, source) {
  if (!source || source.priceType !== "pvpc") {
    return {
      available: false,
      reason:
        "Solo se estiman impuestos cuando la fuente es PVPC y se conocen sus conceptos.",
    };
  }
  const amount = Number(cost);
  if (isMissing(cost) || !Number.isFinite(amount)) {
    return {
      available: false,
      reason: "No hay un precio de energía sobre el que estimar impuestos.",
    };
  }
  if (amount <= 0) {
    return {
      available: false,
      reason:
        "El coste energético es cero o negativo; no se estiman impuestos sobre él.",
    };
  }
  const iee = amount * TAX_RATES.iee;
  const iva = (amount + iee) * TAX_RATES.iva;
  return {
    available: true,
    energy: amount,
    iee,
    iva,
    total: amount + iee + iva,
    ieeRate: TAX_RATES.iee,
    ivaRate: TAX_RATES.iva,
  };
}

export function priceTypeLabel(source) {
  if (!source) return "Fuente sin identificar";
  if (source.priceType === "pvpc") return "PVPC 2.0 TD";
  return source.label || "Precio de la luz";
}

export function sourceNote(source) {
  if (!source) return "";
  if (source.note) return source.note;
  if (source.priceType === "pvpc") {
    return "PVPC 2.0 TD (Península): incluye peajes y cargos; no incluye IEE ni IVA.";
  }
  return "Precio de mercado. No es el precio final de una factura doméstica.";
}
