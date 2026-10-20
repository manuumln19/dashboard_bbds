import {
  addDays,
  eventEndDate,
  eventStartDate,
  isSameDay,
  startOfDay,
} from "./date";

const TONES = ["pink", "mint", "amber", "lilac"];

const TONE_RULES = [
  [/(médic|medic|salud|dentista|fisio|hospital|analítica|analitica)/, "mint"],
  [/(cole|clase|examen|deberes|conservatorio|oboe|música|musica|ensayo)/, "amber"],
  [/(cena|comida|cumple|fiesta|amig|familia|aniversario|concierto|teatro)/, "pink"],
  [/(trabajo|reunión|reunion|oficina|llamada|entrega|proyecto)/, "lilac"],
];

function stableHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function eventTone(event) {
  const text = `${event && event.summary ? event.summary : ""}`.toLowerCase();
  const match = TONE_RULES.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  if (!text) return "ink";
  return TONES[stableHash(text) % TONES.length];
}

export function getEventEnd(event) {
  const start = eventStartDate(event);
  if (event.allDay) {
    const end = event.end ? eventEndDate(event) : addDays(start, 1);
    return end > start ? end : addDays(start, 1);
  }
  const end = eventEndDate(event);
  return end > start ? end : new Date(start.getTime() + 60 * 60 * 1000);
}

export function getNextEvent(events, now) {
  const list = Array.isArray(events) ? events : [];
  const upcoming = list.filter((event) => {
    const end = getEventEnd(event);
    return end > now;
  });

  const timed = upcoming
    .filter((event) => !event.allDay)
    .sort((a, b) => eventStartDate(a) - eventStartDate(b));
  if (timed.length) return timed[0];

  const allDay = upcoming
    .filter((event) => event.allDay)
    .sort((a, b) => eventStartDate(a) - eventStartDate(b));
  return allDay[0] || null;
}

export function formatCountdown(event, now) {
  if (!event) return "Sin citas";
  const start = eventStartDate(event);
  const end = getEventEnd(event);

  if (event.allDay) {
    if (isSameDay(start, now) || (start <= now && end > now)) return "Todo el día";
    const days = Math.round(
      (startOfDay(start).getTime() - startOfDay(now).getTime()) / 86400000
    );
    if (days === 1) return "Mañana";
    return `En ${days} días`;
  }

  if (start <= now && end > now) return "Ahora";
  if (start <= now) return "Ahora";

  const minutes = Math.max(1, Math.ceil((start - now) / 60000));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (minutes < 24 * 60) {
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }

  const days = Math.round(
    (startOfDay(start).getTime() - startOfDay(now).getTime()) / 86400000
  );
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

export function eventsForDay(events, day) {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const list = Array.isArray(events) ? events : [];

  return list
    .map((event) => {
      const start = eventStartDate(event);
      const end = getEventEnd(event);

      if (event.allDay) {
        if (start < dayEnd && end > dayStart) {
          return { event, allDay: true, start, end };
        }
        return null;
      }

      if (end <= dayStart || start >= dayEnd) return null;
      return {
        event,
        allDay: false,
        start: start < dayStart ? dayStart : start,
        end: end > dayEnd ? dayEnd : end,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (b.allDay && !a.allDay) return 1;
      return a.start - b.start;
    });
}

export function groupEventsByDay(events, days) {
  return days.map((day) => ({
    day,
    items: eventsForDay(events, day),
  }));
}

export function layoutDayEvents(items) {
  const timed = items
    .filter((item) => !item.allDay)
    .slice()
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const lanes = [];

  const laidOut = timed.map((item) => {
    let lane = lanes.findIndex((laneEnd) => laneEnd <= item.start);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(item.end);
    } else {
      lanes[lane] = item.end;
    }
    return { ...item, lane };
  });

  const laneCount = Math.max(1, lanes.length);
  return laidOut.map((item) => ({ ...item, laneCount }));
}

export function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
