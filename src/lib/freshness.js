// Registro compartido de la última vez que cada fuente trajo datos buenos.
// El service worker puede servir una copia; `cachedAt` conserva la hora
// original para que la pantalla pueda decir "datos de las 21:34".

import { getDemoControls } from "./demoControls";
import { dateFormat } from "./intl";

const listeners = new Set();

let state = {
  sources: {},
  lastGoodAt: null,
};
let version = 0;
let snapshotCache = null;
let snapshotVersion = -1;
let snapshotForceStale = null;

function emit() {
  version += 1;
  snapshotCache = null;
  listeners.forEach((listener) => listener());
}

export function subscribeFreshness(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reportSync(
  source,
  { at = new Date().toISOString(), cachedAt = null, detail = null } = {}
) {
  const previous = state.sources[source] || {};
  const nextSources = {
    ...state.sources,
    [source]: {
      ...previous,
      at,
      cachedAt: cachedAt || previous.cachedAt || null,
      ok: true,
      detail: detail || null,
      checkedAt: new Date().toISOString(),
    },
  };
  const lastGoodAt =
    !cachedAt && (!state.lastGoodAt || at > state.lastGoodAt)
      ? at
      : state.lastGoodAt;
  state = { sources: nextSources, lastGoodAt };
  emit();
}

export function reportFailure(source, detail = "No se pudo actualizar") {
  const previous = state.sources[source] || {};
  state = {
    ...state,
    sources: {
      ...state.sources,
      [source]: {
        ...previous,
        ok: false,
        detail,
        checkedAt: new Date().toISOString(),
      },
    },
  };
  emit();
}

export function getFreshnessSnapshot() {
  const controls = getDemoControls();
  if (
    snapshotCache &&
    snapshotVersion === version &&
    snapshotForceStale === controls.forceStale
  ) {
    return snapshotCache;
  }

  if (!controls.forceStale) {
    snapshotCache = { ...state, forceStale: false };
  } else {
    const shift = 2 * 60 * 60 * 1000;
    const sources = {};
    Object.entries(state.sources).forEach(([key, value]) => {
      sources[key] = {
        ...value,
        at: value.at
          ? new Date(new Date(value.at).getTime() - shift).toISOString()
          : value.at,
        forcedStale: true,
      };
    });
    snapshotCache = {
      sources,
      lastGoodAt: state.lastGoodAt
        ? new Date(new Date(state.lastGoodAt).getTime() - shift).toISOString()
        : null,
      forceStale: true,
    };
  }
  snapshotVersion = version;
  snapshotForceStale = controls.forceStale;
  return snapshotCache;
}

export function formatFreshnessTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return dateFormat({
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function freshnessAgeMinutes(value) {
  if (!value) return Infinity;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return Infinity;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

export function formatFreshnessAge(value) {
  const minutes = freshnessAgeMinutes(value);
  if (!Number.isFinite(minutes)) return "sin datos";
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function getSource(source) {
  return getFreshnessSnapshot().sources[source] || null;
}
