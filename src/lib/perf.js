// Modo ligero para el marco Frameo (Android 6, RK3126, 1 GB) y equipos
// parecidos: sin animaciones ni transiciones, sin paseos de Yoshi y con hojas
// opacas. `?lite` lo fuerza y `?lite=0` lo quita (para probar).
//
// Se decide una vez al cargar el módulo: main.jsx pone `html.is-lite` y los
// componentes leen `LITE_MODE`.
function detectLite() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("lite")) return params.get("lite") !== "0";
  } catch {
    // Sin URLSearchParams seguimos con la detección por el aparato.
  }
  const nav = window.navigator || {};
  // El WebView del marco no siempre informa de la memoria: la app de quiosco
  // (BBDSKiosk) y Android 7 o anterior bastan para saber que es un equipo justo.
  if (nav.deviceMemory && nav.deviceMemory <= 2) return true;
  if (window.BBDSKiosk) return true;
  return /Android [4-7][.;\s]/.test(nav.userAgent || "");
}

export const LITE_MODE = detectLite();
