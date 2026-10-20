import { createDemoLists } from "./demo";

const LISTS_KEY = "bbds.demo.lists.v2";
const LEGACY_LISTS_KEY = "nido.demo.lists.v1";
const CLEANING_KEY = "bbds.demo.cleaning.v1";

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
