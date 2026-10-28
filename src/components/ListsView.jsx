import { useState } from "react";
import { Cloud, ListChecks, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { DEMO_MODE, MENU_ENABLED } from "../config";
import { formatFreshnessTime } from "../lib/freshness";
import { HandwritingSheet } from "./HandwritingSheet";
import { ListCard } from "./ListCard";
import { MenuSheet } from "./MenuSheet";

const INK_LISTS = {
  shopping: "La compra",
  tasks: "Tareas",
};

export function ListsView({ lists, menu, now = new Date() }) {
  const [inkListId, setInkListId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const openCount = lists.items.filter((item) => !item.done).length;

  function saveRecognizedText(text) {
    if (!inkListId) return;
    lists.addItem(inkListId, text);
    setInkListId(null);
  }

  return (
    <section className="view lists-view" aria-labelledby="lists-title">
      <header className="lists-head">
        <div>
          <span className="eyebrow">Compartido · BBDS</span>
          <h1 id="lists-title">Listas</h1>
          <p>La compra y lo que ronda por casa.</p>
        </div>

        <div className="lists-head__aside">
          {MENU_ENABLED && menu ? (
            <button type="button" className="cleaning-reset cleaning-edit" onClick={() => setMenuOpen(true)}>
              <UtensilsCrossed size={14} strokeWidth={1.9} aria-hidden="true" />
              Menú
            </button>
          ) : null}
          <div className="lists-head__count">
            <strong>{openCount}</strong>
            <span>{openCount === 1 ? "pendiente" : "pendientes"} en total</span>
          </div>
          <span className="lists-head__sync">
            <Cloud size={15} strokeWidth={1.8} aria-hidden="true" />
            {DEMO_MODE
              ? "Guardado en este navegador"
              : lists.lastUpdated
                ? `Sincronizado a las ${formatFreshnessTime(lists.lastUpdated)}`
                : "Sincronizando…"}
          </span>
        </div>
      </header>

      {menuOpen ? <MenuSheet menu={menu} onClose={() => setMenuOpen(false)} /> : null}

      {lists.error ? (
        <div className="inline-alert" role="status">
          No se pudo sincronizar: {lists.error}. Los cambios se reintentarán al
          recargar.
        </div>
      ) : null}

      <div className="lists-grid">
        <ListCard
          listId="shopping"
          title="La compra"
          subtitle="Para la nevera y el súper"
          Icon={ShoppingBasket}
          sticker="lemon"
          items={lists.byList("shopping")}
          people={lists.people}
          now={now}
          onAdd={lists.addItem}
          onToggle={lists.toggleItem}
          onUpdate={lists.updateItem}
          onRemove={lists.removeItem}
          onClear={lists.clearDone}
          onDraw={setInkListId}
        />
        <ListCard
          listId="tasks"
          title="Tareas"
          subtitle="Cosas pequeñas de la casa"
          Icon={ListChecks}
          sticker="star"
          items={lists.byList("tasks")}
          people={lists.people}
          now={now}
          onAdd={lists.addItem}
          onToggle={lists.toggleItem}
          onUpdate={lists.updateItem}
          onRemove={lists.removeItem}
          onClear={lists.clearDone}
          onDraw={setInkListId}
        />
      </div>

      <HandwritingSheet
        open={Boolean(inkListId)}
        listTitle={inkListId ? INK_LISTS[inkListId] : ""}
        onClose={() => setInkListId(null)}
        onSave={saveRecognizedText}
      />
    </section>
  );
}
