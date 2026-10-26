// Crear un Intl.*Format es muy caro en el WebView del marco (cientos de ms al
// abrir una vista). Se reutiliza una instancia por combinación de opciones.
const cache = new Map();

function cached(kind, Ctor, locale, options) {
  const key = `${kind}|${locale}|${JSON.stringify(options)}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Ctor(locale, options);
    cache.set(key, formatter);
  }
  return formatter;
}

export function dateFormat(options = {}, locale = "es-ES") {
  return cached("d", Intl.DateTimeFormat, locale, options);
}

export function numberFormat(options = {}, locale = "es-ES") {
  return cached("n", Intl.NumberFormat, locale, options);
}
