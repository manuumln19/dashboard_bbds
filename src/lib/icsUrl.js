export function normalizeIcsUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    throw new Error("La dirección del calendario no puede estar vacía");
  }
  if (value.length > 2048) {
    throw new Error("La dirección del calendario es demasiado larga");
  }
  const normalized = value.startsWith("webcal://")
    ? `https://${value.slice(9)}`
    : value;
  let url;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error("La dirección del calendario no es válida");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("El calendario debe usar http(s) o webcal");
  }
  return normalized;
}
