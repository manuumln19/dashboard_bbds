import { useState } from "react";
import { Eraser, PenLine, Plus, X } from "lucide-react";
import { isLegacyDrawing } from "../lib/listItems";
import { CheckMark } from "./CheckMark";

export function ListCard({
  listId,
  title,
  subtitle,
  Icon,
  items,
  onAdd,
  onToggle,
  onRemove,
  onClear,
  onDraw,
}) {
  const [text, setText] = useState("");
  const sorted = [...items].sort((a, b) => {
    if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  const openCount = items.filter((item) => !item.done).length;
  const doneCount = items.length - openCount;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function handleSubmit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAdd(listId, value);
    setText("");
  }

  return (
    <article className={`list-panel list-panel--${listId}`}>
      <header className="list-panel__head">
        <div className="list-panel__title">
          <span className="list-panel__icon" aria-hidden="true">
            <Icon size={23} strokeWidth={1.7} />
          </span>
          <div>
            <span className="eyebrow">Lista compartida</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        <div className="list-panel__count">
          <strong>{openCount}</strong>
          <span>{openCount === 1 ? "pendiente" : "pendientes"}</span>
        </div>
      </header>

      <div className="list-panel__progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <form className="list-panel__add" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor={`add-${listId}`}>
          Añadir a {title}
        </label>
        <input
          id={`add-${listId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            listId === "shopping" ? "Añadir a la compra…" : "Añadir una tarea…"
          }
          maxLength={160}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button
          type="button"
          className="list-panel__ink"
          onClick={() => onDraw(listId)}
          aria-label={`Escribir a mano en ${title}`}
          title="Lápiz: escribir a mano (opcional)"
        >
          <PenLine size={19} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <button
          type="submit"
          className="list-panel__submit"
          disabled={!text.trim()}
          aria-label={`Añadir a ${title}`}
        >
          <Plus size={21} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </form>

      <div className="list-panel__body">
        {sorted.length ? (
          <ul className="task-list">
            {sorted.map((item) => (
              <li
                className={`task-row${item.done ? " is-done" : ""}`}
                key={item.id}
              >
                <button
                  type="button"
                  className="task-row__main"
                  onClick={() => onToggle(item)}
                  aria-pressed={item.done}
                  aria-label={`${item.done ? "Desmarcar" : "Marcar"}: ${item.text}`}
                >
                  <CheckMark checked={item.done} />
                  {isLegacyDrawing(item) ? (
                    <img
                      className="task-drawing"
                      src={item.drawing}
                      alt={item.text}
                    />
                  ) : (
                    <span>{item.text}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="task-row__delete"
                  onClick={() => onRemove(item)}
                  aria-label={`Borrar: ${item.text}`}
                >
                  <X size={17} strokeWidth={2} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state empty-state--list">
            <Icon size={35} strokeWidth={1.25} aria-hidden="true" />
            <strong>La lista está vacía</strong>
            <span>Escribe arriba para añadir lo primero.</span>
          </div>
        )}
      </div>

      <footer className="list-panel__foot">
        <span>
          {doneCount
            ? `${doneCount} ${doneCount === 1 ? "hecho" : "hechos"}`
            : "Nada hecho todavía"}
        </span>
        {doneCount > 0 ? (
          <button
            type="button"
            className="clear-button"
            onClick={() => onClear(listId)}
          >
            <Eraser size={14} strokeWidth={1.8} aria-hidden="true" />
            Limpiar hechos
          </button>
        ) : null}
      </footer>
    </article>
  );
}
