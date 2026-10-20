import ICAL from "ical.js";

// Lector de ICS para la demo. El Worker hace lo mismo en worker/index.js;
// aquí se ejecuta en el navegador porque la demo no tiene API ni D1.
// Mantén ambas versiones alineadas si cambia el tratamiento de recurrencias.

const DEFAULT_DAYS = 21;
const DEFAULT_LIMIT = 80;

function registerTimezones(root) {
  root.getAllSubcomponents("vtimezone").forEach((timezone) => {
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

function occurrenceToEvent(details, uid, isException = false) {
  const start = details.startDate;
  const end = details.endDate;
  const allDay = Boolean(start.isDate);
  const startDate = start.toJSDate();
  let endDate = end
    ? end.toJSDate()
    : new Date(startDate.getTime() + 60 * 60 * 1000);

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

export function parseIcsEvents(
  text,
  { days = DEFAULT_DAYS, now = new Date(), limit = DEFAULT_LIMIT } = {}
) {
  const root = new ICAL.Component(ICAL.parse(text));
  registerTimezones(root);

  const components = root.getAllSubcomponents("vevent");
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
      pushEvent(
        occurrenceToEvent(
          { startDate: start, endDate: end || start, item: event },
          uid,
          true
        )
      );
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
    pushEvent(
      occurrenceToEvent(
        {
          startDate: event.startDate,
          endDate: event.endDate || event.startDate,
          item: event,
        },
        uid
      )
    );
  });

  events.sort((a, b) => {
    const aDate = a.allDay ? new Date(`${a.start}T00:00:00`) : new Date(a.start);
    const bDate = b.allDay ? new Date(`${b.start}T00:00:00`) : new Date(b.start);
    return aDate - bDate;
  });

  return events.slice(0, limit);
}
