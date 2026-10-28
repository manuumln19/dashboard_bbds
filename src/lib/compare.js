// Orden de claves ASCII (fechas ISO, "HH:MM", ids). `localeCompare` pasa por
// ICU en cada comparación y en el WebView del marco es mucho más lento.
export function compareText(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? -1 : x > y ? 1 : 0;
}
