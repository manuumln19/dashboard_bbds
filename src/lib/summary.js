// Cuándo se abre solo el resumen semanal. Aparte del componente para que Hoy
// lo pueda comprobar sin cargar el resumen entero al arrancar.
const SEEN_KEY = "bbds.summary.seen";

// El domingo desde las 20:00 el resumen se abre solo, una vez por semana.
export function summaryDue(now, weekKey) {
  if (now.getDay() !== 0 || now.getHours() < 20) return false;
  try {
    return window.localStorage.getItem(SEEN_KEY) !== weekKey;
  } catch {
    return false;
  }
}

export function markSummarySeen(weekKey) {
  try {
    window.localStorage.setItem(SEEN_KEY, weekKey);
  } catch {
    // Sin almacenamiento, se volverá a abrir el domingo que viene igual.
  }
}
