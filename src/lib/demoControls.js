// Controles de demostración en caliente: no cambian el build, solo lo que
// ve la app en este navegador. Sirven para probar noche, idle, offline y
// datos viejos sin esperar a la hora real.

const listeners = new Set();

let state = {
  offline: false,
  forceStale: false,
};

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeDemoControls(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoControls() {
  return state;
}

export function setDemoOffline(value) {
  const next = Boolean(value);
  if (state.offline === next) return;
  state = { ...state, offline: next };
  emit();
}

export function setForceStale(value) {
  const next = Boolean(value);
  if (state.forceStale === next) return;
  state = { ...state, forceStale: next };
  emit();
}

export function isDemoOffline() {
  return state.offline;
}
