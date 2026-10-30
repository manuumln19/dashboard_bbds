import { eventTone, eventsForDay, formatCountdown, getEventEnd } from "./agenda";
import { addDays, eventStartDate, eventTimeLabel, isSameDay, startOfDay } from "./date";
import {
  bandForPrice,
  classifyPriceBands,
  currentPriceState,
  formatHour,
} from "./energy";
import { billStatus, billTitle, kindLabel, periodLabel, periodOf } from "./bills";
import { houseReminders } from "./reminders";
import { hourLabel, isRainyHour, nextHours } from "./weather";
import { compareText } from "./compare";

// Lógica de la pantalla Hoy: qué es «lo siguiente» y qué entra en la línea
// de tiempo de hoy y mañana. Sin JSX, para que las tarjetas solo pinten.

const SOON_MS = 3 * 60 * 60 * 1000;

function localDateKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Lunes = 0, como el cuadrante de limpieza.
export function cleaningDayIndex(date) {
  return (date.getDay() + 6) % 7;
}

export function personFor(people, id) {
  return (people || []).find((person) => person.id === id) || null;
}

// Tramo barato de luz: el actual si ya lo es, o el próximo de hoy.
export function cheapPower(electricity, now) {
  const data = electricity && electricity.data;
  if (!data) return null;
  const state = currentPriceState(data, now);
  if (!state || !state.day || !state.slot) return null;
  const bands = classifyPriceBands(state.day);
  const hours = state.day.hours;
  const index = hours.findIndex((hour) => hour.start === state.slot.start);
  if (index < 0) return null;
  const isCheap = (hour) => bandForPrice(hour.price, bands).id === "cheap";

  if (isCheap(hours[index])) {
    let end = index;
    while (end + 1 < hours.length && isCheap(hours[end + 1])) end += 1;
    const until = end + 1 < hours.length ? formatHour(hours[end + 1].start) : "medianoche";
    return { now: true, label: `La luz está barata hasta las ${until}` };
  }
  const next = hours.slice(index + 1).find(isCheap);
  return next ? { now: false, label: `Luz barata desde las ${formatHour(next.start)}` } : null;
}

// Una lista corta y ordenada por importancia. El primero se pinta grande.
// Cuentas en Hoy, sin importes (la pantalla la ve quien venga a casa): el
// alquiler desde el primer día del plazo hasta que lo paguen los dos, y las
// facturas que vencen en los próximos 3 días o ya han vencido.
function billReminders({ now, bills, people }) {
  if (!bills || !Array.isArray(bills.bills) || !people || !people.length) return [];
  const period = periodOf(now);
  const today = localDateKey(now);
  const soon = localDateKey(addDays(now, 3));
  const items = [];
  (bills.rules || []).forEach((rule) => {
    if (!rule.active || now.getDate() < rule.dayFrom) return;
    const bill = bills.bills.find((item) => item.ruleId === rule.id && item.period === period);
    if (!bill) return;
    const { missing, done } = billStatus(bill, people);
    if (done) return;
    const late = now.getDate() > rule.dayTo;
    items.push({
      id: `bill-${bill.id}`,
      kind: "bill",
      tone: late ? "pink" : "amber",
      kicker: `${kindLabel(rule.kind)} de ${periodLabel(period)}`,
      title: `Falta ${missing.map((person) => person.name).join(" y ")}`,
      detail: late ? `Se pasó el día ${rule.dayTo}` : `Antes del día ${rule.dayTo}`,
    });
  });
  bills.bills
    .filter((bill) => !bill.ruleId && bill.dueOn && bill.dueOn <= soon && !billStatus(bill, people).done)
    .forEach((bill) => {
      items.push({
        id: `bill-${bill.id}`,
        kind: "bill",
        tone: bill.dueOn < today ? "pink" : "amber",
        kicker: "Factura",
        title: `${billTitle(bill)} ${bill.dueOn < today ? "vencida" : bill.dueOn === today ? "vence hoy" : "vence pronto"}`,
        detail: `Falta ${billStatus(bill, people).missing.map((person) => person.name).join(" y ")}`,
      });
    });
  return items;
}

export function nextItems({ now, events, weather, electricity, cleaning, menu, bills }) {
  const items = [];
  const upcoming = (Array.isArray(events) ? events : [])
    .filter((event) => getEventEnd(event) > now)
    .sort((a, b) => eventStartDate(a) - eventStartDate(b));
  const timed = upcoming.filter((event) => !event.allDay);
  const soon = timed.find((event) => eventStartDate(event) - now < SOON_MS);

  if (soon) {
    const countdown = formatCountdown(soon, now);
    items.push({
      id: "event-soon",
      kind: "event",
      tone: eventTone(soon),
      kicker: countdown === "Ahora" ? "Ahora mismo" : `En ${countdown}`,
      title: soon.summary || "Sin título",
      detail: [eventTimeLabel(soon), soon.location].filter(Boolean).join(" · "),
    });
  }

  // Lluvia en lo que queda de día (hasta medianoche, como mucho 14 horas).
  const rainy = nextHours(weather, now, Math.min(14, 24 - now.getHours())).find(isRainyHour);
  if (rainy) {
    items.push({
      id: "rain",
      kind: "rain",
      kicker: "Coge paraguas",
      title: `Lluvia hacia las ${hourLabel(rainy)}`,
      detail: `${Math.round(Number(rainy.precipitationProbability) || 0)}% de probabilidad`,
    });
  }

  const todayIndex = cleaningDayIndex(now);
  const cleaningToday = ((cleaning && cleaning.tasks) || []).filter(
    (task) => task.day === todayIndex && !task.done
  );
  if (cleaningToday.length) {
    const names = [...new Set(cleaningToday.map((task) => task.person.name))];
    items.push({
      id: "cleaning",
      kind: "cleaning",
      kicker: "Limpieza de hoy",
      title: `${names.join(" y ")}: ${cleaningToday.map((task) => task.area.toLowerCase()).join(", ")}`,
      detail: `${cleaningToday.length} ${cleaningToday.length === 1 ? "tarea pendiente" : "tareas pendientes"}`,
    });
  }

  const meal = menu && menu.days ? menu.days[cleaningDayIndex(now)] : null;
  if (meal && meal.dish) {
    items.push({
      id: "menu",
      kind: "menu",
      kicker: "Hoy se come",
      title: meal.dish,
      detail: meal.ingredients.join(", "),
      addToShopping: meal.ingredients.length ? meal.ingredients : null,
    });
  }

  items.push(...billReminders({ now, bills, people: cleaning && cleaning.people }));
  items.push(...houseReminders({ now, cleaning }));


  const power = cheapPower(electricity, now);
  if (power) {
    items.push({ id: "power", kind: "power", kicker: "Luz", title: power.label, detail: "" });
  }

  const later = soon ? timed.find((event) => event !== soon) : upcoming[0];
  if (later) {
    const start = eventStartDate(later);
    const day = isSameDay(start, now)
      ? "Hoy"
      : isSameDay(start, addDays(now, 1))
        ? "Mañana"
        : null;
    items.push({
      id: "event-next",
      kind: "event",
      tone: eventTone(later),
      kicker: day ? `Próximo · ${day.toLowerCase()}` : `Próximo · ${formatCountdown(later, now).toLowerCase()}`,
      title: later.summary || "Sin título",
      detail: eventTimeLabel(later),
    });
  }

  return items;
}

function taskTime(item) {
  return item.dueAt || "";
}

// Hoy y mañana en una sola lista: eventos, tareas con fecha y limpieza.
// Las tareas atrasadas suben a hoy para que no se pierdan.
// `keep`: ids de tareas recién marcadas que aún deben verse (tachadas).
export function timelineDays({ now, events, items, cleaning, people, keep = new Set() }) {
  const today = startOfDay(now);
  const todayKey = localDateKey(today);
  const tomorrow = addDays(today, 1);
  const tomorrowKey = localDateKey(tomorrow);
  const tasks = (items || []).filter(
    (item) => item.listId === "tasks" && item.dueOn && (!item.done || keep.has(item.id))
  );

  return [
    { key: todayKey, label: "Hoy", date: today },
    { key: tomorrowKey, label: "Mañana", date: tomorrow },
  ].map((day) => {
    const isToday = day.key === todayKey;
    const entries = [];

    eventsForDay(events || [], day.date).forEach(({ event, allDay, start }) => {
      const ended = !allDay && getEventEnd(event) <= now;
      const clock = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      entries.push({
        id: `event-${event.uid || event.id || event.summary}-${event.start}`,
        kind: "event",
        sort: allDay ? "00:00" : clock,
        time: allDay ? "Todo el día" : clock,
        title: event.summary || "Sin título",
        meta: event.location || "",
        tone: eventTone(event),
        done: ended,
        event,
      });
    });

    tasks
      .filter((item) => (isToday ? item.dueOn <= todayKey : item.dueOn === day.key))
      .forEach((item) => {
        const person = personFor(people, item.personId);
        const overdue = item.dueOn < todayKey;
        entries.push({
          id: `task-${item.id}`,
          kind: "task",
          sort: taskTime(item) || "00:01",
          time: overdue ? "Atrasada" : taskTime(item) || "",
          title: item.text,
          meta: person ? person.name : "",
          tone: person ? person.tone : "ink",
          overdue,
          done: item.done,
          item,
        });
      });

    if (cleaning && Array.isArray(cleaning.tasks)) {
      const index = cleaningDayIndex(day.date);
      // El cuadrante es semanal: el lunes siguiente aún no tiene estado.
      const sameWeek = index !== 0 || isToday;
      cleaning.tasks
        .filter((task) => task.day === index && sameWeek)
        .forEach((task) => {
          entries.push({
            id: `cleaning-${task.id}`,
            kind: "cleaning",
            sort: "00:02",
            time: "",
            title: `${task.area} · ${task.title}`,
            meta: task.person.name,
            tone: task.person.tone,
            done: task.done,
            task,
          });
        });
    }

    entries.sort((a, b) => compareText(a.sort, b.sort));
    return { ...day, entries };
  });
}
