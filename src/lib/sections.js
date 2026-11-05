import { CLIMATE_ENABLED } from "../config";

// El menú lateral agrupa vistas: «Casa» (compra, tareas y cuentas) y
// «Tiempo» (el tiempo, la luz y, con sensores, el clima de dentro). Cada
// vista conserva su id y su #hash, así que los enlaces de siempre funcionan.
export const SECTIONS = [
  {
    id: "casa",
    label: "Casa",
    views: [
      { id: "lists", label: "Compra" },
      { id: "cleaning", label: "Tareas" },
      { id: "cuentas", label: "Cuentas" },
    ],
  },
  {
    id: "tiempo",
    label: "Tiempo",
    views: [
      { id: "weather", label: "El tiempo" },
      { id: "energy", label: "La luz" },
      ...(CLIMATE_ENABLED ? [{ id: "climate", label: "Dentro" }] : []),
    ],
  },
];

export function sectionOf(view) {
  return SECTIONS.find((section) => section.views.some((item) => item.id === view)) || null;
}
