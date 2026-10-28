import { LITE_MODE } from "./perf";

// Interruptor compartido de los sondeos. Con el salvapantallas abierto no se
// pregunta al servidor (Hoy sigue montado debajo y cada respuesta lo repintaba
// mientras se decodifican las fotos); al cerrarlo, cada hook refresca una vez.
let paused = false;
const resumers = new Set();

export function pollingPaused() {
  return paused;
}

export function setPollingPaused(value) {
  const next = Boolean(value);
  if (next === paused) return;
  paused = next;
  if (!paused) resumers.forEach((resume) => resume());
}

export function onPollingResume(resume) {
  resumers.add(resume);
  return () => resumers.delete(resume);
}

// En el marco (modo ligero) los sondeos se espacian: cada respuesta cuesta un
// repintado y los datos de casa no cambian tan rápido.
export function pollInterval(ms) {
  return LITE_MODE ? ms * 3 : ms;
}
