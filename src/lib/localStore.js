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
