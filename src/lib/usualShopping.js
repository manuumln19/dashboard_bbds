// «Lo de siempre» de la compra: cuántas veces se ha apuntado cada cosa, en
// este navegador (la pantalla de la pared es la que más compra apunta). Sin
// almacenamiento, simplemente no hay sugerencias.
const KEY = "bbds.shopping.usual";
const MAX_KEPT = 60;

function read() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

export function rememberShopping(text) {
  const key = normalize(text);
  if (!key) return;
  const counts = read();
  const entry = counts[key] || { text: String(text).trim(), n: 0 };
  counts[key] = { text: entry.text, n: entry.n + 1, at: Date.now() };
  // Solo las más frecuentes, para que no crezca sin fin.
  const kept = Object.entries(counts)
    .sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at)
    .slice(0, MAX_KEPT);
  try {
    const next = kept.reduce((all, [key, value]) => ({ ...all, [key]: value }), {});
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento, nada que recordar.
  }
}

// Lo que se ha apuntado al menos dos veces y ahora no está en la lista.
export function usualShopping(openTexts, limit = 8) {
  const open = new Set((openTexts || []).map(normalize));
  return Object.entries(read())
    .filter(([key, entry]) => entry.n >= 2 && !open.has(key))
    .sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at)
    .slice(0, limit)
    .map(([, entry]) => entry.text);
}
