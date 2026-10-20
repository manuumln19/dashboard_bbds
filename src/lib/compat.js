// Comprobación rápida de lo que este WebView entiende de verdad.
// No intenta adivinar por la versión: prueba CSS y APIs en el navegador que
// está delante de la pantalla.

function cssSupports(property, value) {
  try {
    return typeof CSS !== "undefined" && CSS.supports(property, value);
  } catch {
    return false;
  }
}

function selectorSupports(selector) {
  try {
    return typeof CSS !== "undefined" && CSS.supports(`selector(${selector})`);
  } catch {
    return false;
  }
}

function detectFlexGap() {
  if (typeof document === "undefined") return false;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:absolute;left:-9999px;top:0;display:flex;flex-direction:column;row-gap:10px;width:12px;";
  const first = document.createElement("span");
  first.style.cssText = "display:block;height:10px;";
  const second = document.createElement("span");
  second.style.cssText = "display:block;height:10px;";
  host.appendChild(first);
  host.appendChild(second);
  document.body.appendChild(host);
  const gap =
    second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
  host.remove();
  return gap >= 9;
}

function chromiumVersion() {
  const match = navigator.userAgent.match(/(?:Chrome|CriOS)\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function getCompatReport() {
  const version = chromiumVersion();
  const items = [
    {
      id: "fetch",
      label: "Fetch y red",
      ok: typeof fetch === "function",
      required: true,
      hint: "Sin fetch no se pueden actualizar los datos.",
    },
    {
      id: "abort",
      label: "AbortController",
      ok: typeof AbortController === "function",
      required: true,
      hint: "Corta las peticiones que se quedan colgadas.",
    },
    {
      id: "flex-gap",
      label: "Gap en flex",
      ok: detectFlexGap(),
      required: false,
      hint: "Si falta, algunos espacios quedan juntos.",
    },
    {
      id: "backdrop",
      label: "Cristal / desenfoque",
      ok:
        cssSupports("backdrop-filter", "blur(1px)") ||
        cssSupports("-webkit-backdrop-filter", "blur(1px)"),
      required: false,
      hint: "Solo cambia el efecto visual; el contenido sigue.",
    },
    {
      id: "color-mix",
      label: "color-mix()",
      ok: cssSupports("color", "color-mix(in srgb, white, black)"),
      required: false,
      hint: "La capa visual puede perder matices.",
    },
    {
      id: "has",
      label: "Selector :has()",
      ok: selectorSupports(":has(*)"),
      required: false,
      hint: "Algunos ajustes finos de estilo.",
    },
    {
      id: "dvh",
      label: "Unidades dvh",
      ok: cssSupports("height", "100dvh"),
      required: false,
      hint: "Alturas de pantalla completa en móvil.",
    },
    {
      id: "service-worker",
      label: "Service worker",
      ok: "serviceWorker" in navigator,
      required: false,
      hint: "Sin él no hay copia offline; la app sigue.",
    },
    {
      id: "caches",
      label: "Cache Storage",
      ok: "caches" in window,
      required: false,
      hint: "Guarda la última copia de los datos.",
    },
    {
      id: "wasm",
      label: "WebAssembly (OCR)",
      ok: typeof WebAssembly === "object",
      required: false,
      hint: "Solo afecta a la libreta; el texto se puede escribir.",
    },
    {
      id: "wake-lock",
      label: "Wake Lock",
      ok: "wakeLock" in navigator,
      required: false,
      hint: "Si no está, la pantalla puede atenuarse.",
    },
    {
      id: "resize-observer",
      label: "ResizeObserver",
      ok: typeof ResizeObserver === "function",
      required: false,
      hint: "Ajustes de tamaño de la galería.",
    },
  ];

  return {
    version,
    items,
    failures: items.filter((item) => item.required && !item.ok),
    warnings: items.filter((item) => !item.required && !item.ok),
  };
}
