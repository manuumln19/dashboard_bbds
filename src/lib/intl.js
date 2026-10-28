// Crear un Intl.*Format es muy caro en el WebView del marco (cientos de ms al
// abrir una vista). Se reutiliza una instancia por combinación de opciones.
const cache = new Map();
// Atajo sin JSON.stringify cuando se pasa siempre el mismo objeto de opciones
// (constantes de módulo): es lo habitual en el código que se ejecuta a menudo.
const byObject = typeof WeakMap === "function" ? new WeakMap() : null;

function cached(kind, Ctor, locale, options) {
  const quick = byObject && options && typeof options === "object" ? byObject.get(options) : null;
  if (quick && quick.kind === kind && quick.locale === locale) return quick.formatter;
  const formatter = slow(kind, Ctor, locale, options);
  if (byObject && options && typeof options === "object") byObject.set(options, { kind, locale, formatter });
  return formatter;
}

function slow(kind, Ctor, locale, options) {
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
