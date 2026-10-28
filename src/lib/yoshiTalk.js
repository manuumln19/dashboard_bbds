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

// Las tareas que alimentan a Yoshi (limpieza de la semana y tareas de la
// lista), cada una con su estado: «c:<id>=1» hecha, «=0» pendiente. Va como
// texto para que el Yoshi memorizado de App solo cambie si cambia algo. Con
// el id, Yoshi sabe qué tarea le dio cada manzana y la devuelve si se
// desmarca; un número solo dejaba ver que subía.
export function doneState({ cleaning, lists }) {
  const entries = [];
  ((cleaning && cleaning.tasks) || []).forEach((task) => entries.push(`c:${task.id}=${task.done ? 1 : 0}`));
  (lists && lists.byList ? lists.byList("tasks") : []).forEach((item) => entries.push(`l:${item.id}=${item.done ? 1 : 0}`));
  return entries.join(",");
}

export function parseDoneState(text) {
  const state = {};
  String(text || "")
    .split(",")
    .forEach((entry) => {
      const split = entry.lastIndexOf("=");
      if (split > 0) state[entry.slice(0, split)] = entry.slice(split + 1) === "1";
    });
  return state;
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
