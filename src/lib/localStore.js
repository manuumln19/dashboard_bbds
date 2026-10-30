import { createDemoLists } from "./demo";

export const DEMO_PEOPLE = [
  { id: "manu", name: "Manu", tone: "pink", initials: "M" },
  { id: "paco", name: "Paco", tone: "mint", initials: "P" },
];

const LISTS_KEY = "bbds.demo.lists.v2";
const LEGACY_LISTS_KEY = "nido.demo.lists.v1";
const CLEANING_KEY = "bbds.demo.cleaning.v1";
const CALENDARS_KEY = "bbds.demo.calendars.v1";

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readArray(key) {
  const parsed = readJson(key);
  return Array.isArray(parsed) ? parsed : null;
}

export function loadDemoLists() {
  return readArray(LISTS_KEY) || readArray(LEGACY_LISTS_KEY) || createDemoLists();
}

export function saveDemoLists(items) {
  try {
    window.localStorage.setItem(LISTS_KEY, JSON.stringify(items));
  } catch {
    // El dashboard sigue funcionando aunque el WebView no permita storage.
  }
}

function hydrateCalendar(calendar) {
  const personId = calendar.personId ? String(calendar.personId) : null;
  const person = personId
    ? DEMO_PEOPLE.find((entry) => entry.id === personId) || null
    : null;
  return {
    ...calendar,
    name: String(calendar.name || ""),
    url: String(calendar.url || ""),
    color: calendar.color || "lilac",
    personId: person ? person.id : null,
    person,
    active: calendar.active !== false,
  };
}

export function loadDemoCalendars(fallback = []) {
  const parsed = readArray(CALENDARS_KEY);
  if (!parsed) return fallback;
  return parsed
    .filter(
      (calendar) =>
        calendar && calendar.id && calendar.name && calendar.url
    )
    .map(hydrateCalendar);
}

export function saveDemoCalendars(calendars) {
  try {
    const definitions = calendars.map(
      ({ id, name, url, color, personId, active, createdAt, updatedAt }) => ({
        id,
        name,
        url,
        color,
        personId,
        active,
        createdAt,
        updatedAt,
      })
    );
    window.localStorage.setItem(CALENDARS_KEY, JSON.stringify(definitions));
  } catch {
    // La agenda real sigue funcionando; solo se pierde la persistencia.
  }
}

export function loadDemoCleaning() {
  const parsed = readJson(CLEANING_KEY);
  return parsed && typeof parsed === "object" ? parsed : null;
}

export function saveDemoCleaning(state) {
  try {
    window.localStorage.setItem(CLEANING_KEY, JSON.stringify(state));
  } catch {
    // La limpieza funciona igual; solo se pierde la persistencia.
  }
}

const NOTES_KEY = "bbds.demo.notes.v1";

export function loadDemoNotes() {
  const saved = readArray(NOTES_KEY);
  if (saved) return saved;
  const hour = 60 * 60 * 1000;
  return [
    {
      id: "note-demo-1",
      text: "Hay tortilla en la nevera. Para los dos, no te la comas entera.",
      personId: "manu",
      color: "pink",
      createdAt: new Date(Date.now() - 2 * hour).toISOString(),
    },
    {
      id: "note-demo-2",
      text: "Llamar al fontanero antes del jueves.",
      personId: "paco",
      color: "mint",
      shape: "round",
      rot: 3,
      createdAt: new Date(Date.now() - 26 * hour).toISOString(),
    },
  ];
}

export function saveDemoNotes(notes) {
  try {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // Las notas se ven igual; solo se pierden al recargar.
  }
}

const POINTS_KEY = "bbds.demo.points.v1";

// Puntos a mano de la demo: uno de ejemplo para cada uno.
export function loadDemoPoints() {
  const saved = readArray(POINTS_KEY);
  if (saved) return saved;
  const hour = 60 * 60 * 1000;
  return [
    { id: "pt-demo-1", personId: "manu", points: 10, reason: "Hizo la cena", createdAt: new Date(Date.now() - 20 * hour).toISOString() },
    { id: "pt-demo-2", personId: "paco", points: 2.5, reason: "Bajó la basura", createdAt: new Date(Date.now() - 3 * hour).toISOString() },
  ];
}

export function saveDemoPoints(events) {
  try {
    window.localStorage.setItem(POINTS_KEY, JSON.stringify(events));
  } catch {
    // Los puntos se ven igual; solo se pierden al recargar.
  }
}

const REDEMPTIONS_KEY = "bbds.demo.redemptions.v1";

export function loadDemoRedemptions() {
  return readArray(REDEMPTIONS_KEY) || [];
}

export function saveDemoRedemptions(redemptions) {
  try {
    window.localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptions));
  } catch {
    // Se ven igual; solo se pierden al recargar.
  }
}

const MENU_KEY = "bbds.demo.menu.v1";

export function loadDemoMenu() {
  return readArray(MENU_KEY);
}

export function saveDemoMenu(days) {
  try {
    window.localStorage.setItem(MENU_KEY, JSON.stringify(days));
  } catch {
    // Sin persistencia, el menú dura hasta recargar.
  }
}
