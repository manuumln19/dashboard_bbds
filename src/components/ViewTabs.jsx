import { memo } from "react";
import { sectionOf } from "../lib/sections";

// Pestañas dentro de una sección del menú (Casa, Tiempo): las vistas de la
// sección, con su número cuando hay algo pendiente.
export const ViewTabs = memo(function ViewTabs({ view, badges = {}, onChange }) {
  const section = sectionOf(view);
  if (!section) return null;
  return (
    <nav className="view-tabs" aria-label={section.label}>
      {section.views.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`view-tabs__tab${item.id === view ? " is-on" : ""}`}
          aria-current={item.id === view ? "page" : undefined}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {badges[item.id] ? <b>{badges[item.id]}</b> : null}
        </button>
      ))}
    </nav>
  );
});
