// Fase de la luna a partir de una luna nueva conocida (6 ene 2000, 18:14 UTC).
// Precisión de horas: de sobra para una pantalla de noche.

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

const NAMES = [
  "Luna nueva",
  "Luna creciente",
  "Cuarto creciente",
  "Gibosa creciente",
  "Luna llena",
  "Gibosa menguante",
  "Cuarto menguante",
  "Luna menguante",
];

export function moonPhase(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  const age = ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const phase = age / SYNODIC_DAYS; // 0 nueva, 0.5 llena
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const name = NAMES[Math.round(phase * 8) % 8];
  return { phase, illumination, name };
}
