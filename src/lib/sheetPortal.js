import { createPortal } from "react-dom";

// Las hojas (ink-overlay) se pintan en la raíz de la app y no dentro de su
// vista: `.app-main` y la vista animada forman su propio apilamiento, y una
// hoja abierta ahí quedaba por debajo de la barra lateral (se veía la barra,
// con Yoshi, encima de la hoja). Dentro de `.app` heredan el modo noche.
export function sheetPortal(node) {
  if (typeof document === "undefined") return node;
  return createPortal(node, document.querySelector(".app") || document.body);
}
