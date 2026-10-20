import { addDays, capitalize, formatMonth, startOfWeek } from "./date";

// El cuadrante vive en el navegador: es una rutina fija de la casa, no una
// lista sincronizada. Cada tarea tiene un id estable para conservar los checks
// aunque cambie el orden o se añada una tarea nueva en el futuro.
export const CLEANING_PEOPLE = [
  { id: "manuel", name: "Manuel", tone: "pink" },
  { id: "paco", name: "Paco", tone: "mint" },
  { id: "ana", name: "Ana", tone: "amber" },
  { id: "lucia", name: "Lucía", tone: "lilac" },
];

export const CLEANING_TASKS = [
  {
    id: "mon-cocina",
    day: 0,
    personId: "manuel",
    area: "Cocina",
    title: "Encimera y vitro",
  },
  {
    id: "mon-salon",
    day: 0,
    personId: "paco",
    area: "Salón",
    title: "Aspirar y ordenar",
  },
  {
    id: "tue-bano",
    day: 1,
    personId: "ana",
    area: "Baño",
    title: "Baño principal",
  },
  {
    id: "tue-entrada",
    day: 1,
    personId: "manuel",
    area: "Entrada",
    title: "Zapatos y paraguas",
  },
  {
    id: "wed-cocina",
    day: 2,
    personId: "paco",
    area: "Cocina",
    title: "Fregadero y vitro",
  },
  {
    id: "wed-dormitorios",
    day: 2,
    personId: "lucia",
    area: "Dormitorios",
    title: "Cambiar sábanas",
  },
  {
    id: "thu-salon",
    day: 3,
    personId: "ana",
    area: "Salón",
    title: "Polvo y cojines",
  },
  {
    id: "thu-comedor",
    day: 3,
    personId: "manuel",
    area: "Comedor",
    title: "Mesa y cristalera",
  },
  {
    id: "fri-bano",
    day: 4,
    personId: "paco",
    area: "Baño",
    title: "Baño pequeño",
  },
  {
    id: "fri-cocina",
    day: 4,
    personId: "lucia",
    area: "Cocina",
    title: "Nevera y despensa",
  },
  {
    id: "sat-terraza",
    day: 5,
    personId: "manuel",
    area: "Terraza",
    title: "Barrer y ordenar",
  },
  {
    id: "sat-colada",
    day: 5,
    personId: "ana",
    area: "Colada",
    title: "Lavadora y tender",
  },
  {
    id: "sun-pasillo",
    day: 6,
    personId: "lucia",
    area: "Pasillo",
    title: "Repaso y espejos",
  },
  {
    id: "sun-salon",
    day: 6,
    personId: "paco",
    area: "Salón",
    title: "Manta y sofá",
  },
];

export function personById(personId) {
  return (
    CLEANING_PEOPLE.find((person) => person.id === personId) || {
      id: personId,
      name: "Casa",
      tone: "ink",
    }
  );
}

export function weekKey(date = new Date()) {
  const monday = startOfWeek(date);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(monday.getDate()).padStart(2, "0")}`;
}

export function weekDays(date = new Date()) {
  const monday = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function weekRangeLabel(date = new Date()) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const startMonth = formatMonth(start);
  const endMonth = formatMonth(end);
  if (startMonth === endMonth) {
    return `${start.getDate()}–${end.getDate()} ${startMonth}`;
  }
  return `${start.getDate()} ${startMonth.slice(0, 3)} – ${end.getDate()} ${endMonth.slice(0, 3)}`;
}

export function weekdayLong(date) {
  return capitalize(
    new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date)
  );
}

export function monthShort(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(date)
    .replace(".", "");
}

export function createCleaningState(now = new Date(), saved = null) {
  const key = weekKey(now);
  const sameWeek = saved && saved.weekKey === key;
  const done =
    sameWeek && saved.done && typeof saved.done === "object" ? saved.done : {};
  return { weekKey: key, done };
}

export function tasksWithState(done = {}) {
  return CLEANING_TASKS.map((task) => ({
    ...task,
    person: personById(task.personId),
    done: Boolean(done[task.id]),
  }));
}
