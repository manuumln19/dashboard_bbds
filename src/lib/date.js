import { dateFormat } from "./intl.js";

export function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatClock(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatClockWithSeconds(date) {
  return `${formatClock(date)}:${pad(date.getSeconds())}`;
}

export function formatLongDate(date) {
  const formatted = dateFormat({
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return capitalize(formatted);
}

export function formatShortDay(date) {
  return dateFormat({
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(/\.$/, "");
}

export function formatMonth(date) {
  return dateFormat({ month: "long" }).format(date);
}

export function formatEventTime(date) {
  return dateFormat({
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseAllDay(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Analizar la fecha de un evento es lo caro al ordenar (cientos de veces por
// render en el marco); se guarda una vez por evento. Los eventos son los
// mismos objetos entre sondeos mientras no cambian.
const startCache = typeof WeakMap === "function" ? new WeakMap() : null;

export function eventStartDate(event) {
  if (startCache && event && typeof event === "object") {
    let ms = startCache.get(event);
    if (ms === undefined) {
      ms = (event.allDay ? parseAllDay(event.start) : new Date(event.start)).getTime();
      startCache.set(event, ms);
    }
    return new Date(ms);
  }
  return event.allDay ? parseAllDay(event.start) : new Date(event.start);
}

export function eventEndDate(event) {
  if (!event.end) return eventStartDate(event);
  return event.allDay ? parseAllDay(event.end) : new Date(event.end);
}

export function relativeDayLabel(date, now = new Date()) {
  const today = startOfDay(now);
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff < 7) {
    return capitalize(
      dateFormat({ weekday: "long" }).format(date)
    );
  }
  return dateFormat({
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(/\.$/, "");
}

export function eventTimeLabel(event) {
  if (event.allDay) return "Todo el día";
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  if (!end) return formatEventTime(start);
  return `${formatEventTime(start)}–${formatEventTime(end)}`;
}

export function getUpcomingEvents(events, now, limit = 4) {
  const list = Array.isArray(events) ? events : [];
  return list
    .filter((event) => {
      const start = eventStartDate(event);
      let end = eventEndDate(event);
      if (event.allDay) {
        // El DTEND de un evento de día completo es exclusivo. Si no existe,
        // el evento dura un día.
        if (!event.end) end = addDays(start, 1);
      }
      return end >= now;
    })
    .sort((a, b) => {
      const aStart = eventStartDate(a);
      const bStart = eventStartDate(b);
      if (a.allDay && !b.allDay && isSameDay(aStart, now)) return -1;
      if (b.allDay && !a.allDay && isSameDay(bStart, now)) return 1;
      return aStart - bStart;
    })
    .slice(0, limit);
}

export function formatAge(dateValue, now = new Date()) {
  if (!dateValue) return "Sin datos";
  const date = new Date(dateValue);
  const seconds = Math.max(0, Math.round((now - date) / 1000));
  if (seconds < 60) return "Ahora";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Hace ${days} d`;
}

export function isStale(dateValue, maxMinutes = 6, now = new Date()) {
  if (!dateValue) return true;
  return now - new Date(dateValue) > maxMinutes * 60000;
}

export function getGreeting(date) {
  const hour = date.getHours();
  if (hour < 6) return "Buenas noches";
  if (hour < 13) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function greetingForWeather(date, weather) {
  const base = getGreeting(date);
  if (!weather || !weather.current) return base;
  if (weather.current.isDay === false && date.getHours() >= 20) {
    return "Buenas noches";
  }
  return base;
}

export function startOfWeek(date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function minutesFromTime(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

// Momento del día para el color y el énfasis de Hoy (la noche la lleva el
// modo noche): amanecer 6–10, día 10–17, tarde 17–21 y noche el resto.
export function dayPhase(date) {
  const hour = date.getHours();
  if (hour >= 6 && hour < 10) return "amanecer";
  if (hour >= 10 && hour < 17) return "dia";
  if (hour >= 17 && hour < 21) return "tarde";
  return "noche";
}
