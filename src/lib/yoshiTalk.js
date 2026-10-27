import { eventStartDate } from "./date";
import { birthdaysOn, upcomingBirthday } from "./season";
import { cleaningDayIndex } from "./today";

// Lo que Yoshi sabe de casa: frases sobre la limpieza de hoy, el próximo
// evento, la compra y los cumpleaños. Se calcula en cada render (barato) y
// Yoshi elige una al tocarlo.

function lower(text) {
  const value = String(text || "").trim();
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function joinEs(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function cleaningLines(cleaning, now) {
  const today = cleaningDayIndex(now);
  const pending = ((cleaning && cleaning.tasks) || []).filter((task) => task.day === today && !task.done);
  return pending.map((task) => {
    const name = task.person ? task.person.name : null;
    const what = lower(task.title);
    return name ? `¡Ánimo, ${name}! Hoy te toca ${what}.` : `Hoy toca ${what}.`;
  });
}

function eventLines(events, now) {
  const soon = (Array.isArray(events) ? events : [])
    .filter((event) => !event.allDay)
    .map((event) => ({ event, minutes: Math.round((eventStartDate(event) - now) / 60000) }))
    .filter((item) => item.minutes > 0 && item.minutes <= 180)
    .sort((a, b) => a.minutes - b.minutes)[0];
  if (!soon) return [];
  const when =
    soon.minutes < 60
      ? `En ${soon.minutes} min`
      : `En ${Math.floor(soon.minutes / 60)} h${soon.minutes % 60 >= 10 ? ` ${soon.minutes % 60} min` : ""}`;
  const who = soon.event.personName ? `, ${soon.event.personName}` : "";
  return [`${when}: ${lower(soon.event.summary)}${who}.`];
}

function shoppingLines(lists) {
  const items = (lists && lists.byList ? lists.byList("shopping") : []).filter((item) => !item.done && item.text);
  if (!items.length) return [];
  const names = items.slice(0, 2).map((item) => lower(item.text));
  if (items.length === 1) return [`En la compra falta ${names[0]}.`];
  if (items.length === 2) return [`En la compra faltan ${names[0]} y ${names[1]}.`];
  const rest = items.length - 2;
  return [`En la compra: ${names[0]}, ${names[1]}… y ${rest} ${rest === 1 ? "cosa" : "cosas"} más.`];
}

function birthdayLines(people, now) {
  const today = birthdaysOn(now, people);
  if (today.length) return [`¡Feliz cumple, ${joinEs(today.map((person) => person.name))}! 🎂`];
  const next = upcomingBirthday(now, people, 1);
  return next ? [`¡Mañana es el cumple de ${next.person.name}! 🎂`] : [];
}

export function houseLines({ now, cleaning, events, lists }) {
  return [
    ...birthdayLines(cleaning ? cleaning.people : [], now),
    ...eventLines(events, now),
    ...cleaningLines(cleaning, now),
    ...shoppingLines(lists),
  ];
}

// Tareas hechas que alimentan a Yoshi: limpieza de la semana y tareas de la
// lista marcadas. Solo importa que suba (cada subida es una manzana).
export function doneCount({ cleaning, lists }) {
  const listDone = (lists && lists.byList ? lists.byList("tasks") : []).filter((item) => item.done).length;
  return ((cleaning && cleaning.doneCount) || 0) + listDone;
}

// Avisos sueltos para Yoshi (una nota nueva…), sin pasar props por media app.
const EVENT = "bbds:yoshi";

export function tellYoshi(type) {
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { type } }));
  } catch {
    // Sin CustomEvent (no pasa en el marco), Yoshi simplemente no se entera.
  }
}

export function listenYoshi(handler) {
  function onEvent(event) {
    handler(event.detail ? event.detail.type : null);
  }
  window.addEventListener(EVENT, onEvent);
  return () => window.removeEventListener(EVENT, onEvent);
}
