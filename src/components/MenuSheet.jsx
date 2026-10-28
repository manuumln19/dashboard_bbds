import { useState } from "react";
import { UtensilsCrossed, X } from "lucide-react";
import { sheetPortal } from "../lib/sheetPortal";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Editor del menú semanal: plato e ingredientes (separados por comas).
export function MenuSheet({ menu, onClose }) {
  const [draft, setDraft] = useState(() =>
    menu.days.map((day) => ({ dish: day.dish, ingredients: day.ingredients.join(", ") }))
  );
  const [saving, setSaving] = useState(false);

  function update(index, field, value) {
    setDraft((current) => current.map((day, i) => (i === index ? { ...day, [field]: value } : day)));
  }

  async function save() {
    setSaving(true);
    try {
      await menu.saveMenu(
        draft.map((day) => ({
          dish: day.dish.trim(),
          ingredients: day.ingredients.split(",").map((item) => item.trim()).filter(Boolean),
        }))
      );
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return sheetPortal(
    <div
      className="ink-overlay feature-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="ink-sheet card menu-sheet" role="dialog" aria-modal="true" aria-labelledby="menu-title">
        <header className="ink-head">
          <span className="ink-head__icon" aria-hidden="true">
            <UtensilsCrossed size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">La cocina</span>
            <h2 id="menu-title">Menú de la semana</h2>
            <p>Lo que se come cada día. Los ingredientes pasan a la compra desde Hoy.</p>
          </div>
          <button type="button" className="icon-button ink-close" onClick={onClose} aria-label="Cerrar el menú">
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        <div className="menu-sheet__days">
          {DAYS.map((label, index) => (
            <div className="menu-sheet__day" key={label}>
              <strong>{label}</strong>
              <input
                type="text"
                maxLength={80}
                placeholder="Plato"
                value={draft[index].dish}
                onChange={(event) => update(index, "dish", event.target.value)}
              />
              <input
                type="text"
                placeholder="Ingredientes, separados por comas"
                value={draft[index].ingredients}
                onChange={(event) => update(index, "ingredients", event.target.value)}
              />
            </div>
          ))}
        </div>

        {menu.error ? <p className="feature-alert">{menu.error}</p> : null}

        <footer className="menu-sheet__foot">
          <button type="button" className="notes-sheet__submit" onClick={save} disabled={saving}>
            Guardar menú
          </button>
        </footer>
      </section>
    </div>
  );
}
