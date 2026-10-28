import { useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  Eraser,
  PenLine,
  Plus,
  X,
} from "lucide-react";
import { isLegacyDrawing } from "../lib/listItems";
import { CheckMark } from "./CheckMark";
import { TodoBadges, TodoMetaFields } from "./TodoFields";

function dueTimestamp(item) {
  if (!item.dueOn) return Infinity;
  const date = new Date(`${item.dueOn}T${item.dueAt || "23:59"}:00`);
  const time = date.getTime();
  return Number.isFinite(time) ? time : Infinity;
}

export function ListCard({
  listId,
  title,
  subtitle,
  Icon,
  items,
  people = [],
  now = new Date(),
  onAdd,
  onToggle,
  onUpdate,
  onRemove,
  onClear,
  onDraw,
}) {
  // El campo no es controlado: escribir no redibuja la lista entera (en el
  // marco cada tecla repintaba todas las tareas y se notaba retraso). React
  // solo sabe si está vacío, para activar «Añadir».
  const inputRef = useRef(null);
  const [hasText, setHasText] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [addMeta, setAddMeta] = useState({
    dueOn: null,
    dueAt: null,
    personId: "",
  });
  const [editingMetaId, setEditingMetaId] = useState(null);
  const [metaDraft, setMetaDraft] = useState({
    dueOn: null,
    dueAt: null,
    personId: "",
  });
  const isTasks = listId === "tasks";

  const sorted = [...items].sort((a, b) => {
    if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1;
    if (isTasks) {
      const aDue = dueTimestamp(a);
      const bDue = dueTimestamp(b);
      if (aDue !== bDue) return aDue - bDue;
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  // Lo hecho se pliega: por defecto solo lo pendiente; el pie lo despliega.
  const [showDone, setShowDone] = useState(false);
  const visible = showDone ? sorted : sorted.filter((item) => !item.done);
  const openCount = items.filter((item) => !item.done).length;
  const doneCount = items.length - openCount;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  function handleSubmit(event) {
    event.preventDefault();
    const input = inputRef.current;
    const value = input ? input.value.trim() : "";
    if (!value) return;
    const meta = isTasks
      ? {
          dueOn: addMeta.dueOn || null,
          dueAt: addMeta.dueAt || null,
          personId: addMeta.personId || null,
        }
      : {};
    onAdd(listId, value, meta);
    if (input) input.value = "";
    setHasText(false);
  }

  function openMeta(item) {
    setEditingMetaId(item.id);
    setMetaDraft({
      dueOn: item.dueOn || null,
      dueAt: item.dueAt || null,
      personId: item.person ? item.person.id : "",
    });
  }

  function closeMeta() {
    setEditingMetaId(null);
  }

  function saveMeta(item) {
    onUpdate(item, {
      dueOn: metaDraft.dueOn || null,
      dueAt: metaDraft.dueAt || null,
      personId: metaDraft.personId || null,
    });
    setEditingMetaId(null);
  }

  function clearMeta(item) {
    onUpdate(item, { dueOn: null, dueAt: null, personId: null });
    setEditingMetaId(null);
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
          ref={inputRef}
          defaultValue=""
          onChange={(event) => setHasText(event.target.value.trim() !== "")}
          placeholder={
            listId === "shopping" ? "Añadir a la compra…" : "Añadir una tarea…"
          }
          maxLength={160}
          autoComplete="off"
          enterKeyHint="done"
        />
        {isTasks ? (
          <button
            type="button"
            className={`list-panel__schedule${scheduleOpen ? " is-on" : ""}`}
            onClick={() => setScheduleOpen((value) => !value)}
            aria-label="Programar la tarea"
            aria-pressed={scheduleOpen}
            title="Fecha, hora y persona"
          >
            <CalendarClock size={19} strokeWidth={1.9} aria-hidden="true" />
          </button>
        ) : null}
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
          disabled={!hasText}
          aria-label={`Añadir a ${title}`}
        >
          <Plus size={21} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </form>

      {isTasks && scheduleOpen ? (
        <div className="list-panel__add-meta">
          <TodoMetaFields
            dueOn={addMeta.dueOn}
            dueAt={addMeta.dueAt}
            personId={addMeta.personId}
            people={people}
            idPrefix={`add-${listId}`}
            onChange={(patch) =>
              setAddMeta((current) => ({ ...current, ...patch }))
            }
          />
        </div>
      ) : null}

      <div className="list-panel__body">
        {visible.length ? (
          <ul className="task-list">
            {visible.map((item) => (
              <li className="task-item" key={item.id}>
                <div
                  className={`task-row${item.done ? " is-done" : ""}${
                    editingMetaId === item.id ? " is-editing" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="task-row__main"
                    onClick={() => onToggle(item)}
                    aria-pressed={item.done}
                    aria-label={`${item.done ? "Desmarcar" : "Marcar"}: ${
                      item.text
                    }`}
                  >
                    <CheckMark checked={item.done} />
                    <span className="task-row__content">
                      {isLegacyDrawing(item) ? (
                        <img
                          className="task-drawing"
                          src={item.drawing}
                          alt={item.text}
                        />
                      ) : (
                        <span>{item.text}</span>
                      )}
                      {isTasks ? (
                        <TodoBadges item={item} now={now} people={people} />
                      ) : null}
                    </span>
                  </button>
                  {isTasks ? (
                    <button
                      type="button"
                      className={`task-row__meta${
                        item.dueOn || item.person ? " is-set" : ""
                      }`}
                      onClick={() =>
                        editingMetaId === item.id
                          ? closeMeta()
                          : openMeta(item)
                      }
                      aria-label={`Cambiar fecha y persona de ${item.text}`}
                      aria-expanded={editingMetaId === item.id}
                    >
                      <CalendarClock
                        size={16}
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="task-row__delete"
                    onClick={() => onRemove(item)}
                    aria-label={`Borrar: ${item.text}`}
                  >
                    <X size={17} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>

                {isTasks && editingMetaId === item.id ? (
                  <div className="task-row__meta-editor">
                    <TodoMetaFields
                      dueOn={metaDraft.dueOn}
                      dueAt={metaDraft.dueAt}
                      personId={metaDraft.personId}
                      people={people}
                      idPrefix={`task-${item.id}`}
                      onChange={(patch) =>
                        setMetaDraft((current) => ({
                          ...current,
                          ...patch,
                        }))
                      }
                    />
                    <div className="task-row__meta-actions">
                      <button
                        type="button"
                        className="feature-mini-button"
                        onClick={() => clearMeta(item)}
                      >
                        <X size={14} strokeWidth={2} aria-hidden="true" />
                        Quitar
                      </button>
                      <button
                        type="button"
                        className="feature-button"
                        onClick={() => saveMeta(item)}
                      >
                        <Check size={15} strokeWidth={2.2} aria-hidden="true" />
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state empty-state--list">
            <Icon size={35} strokeWidth={1.25} aria-hidden="true" />
            <strong>{items.length ? "Todo hecho" : "La lista está vacía"}</strong>
            <span>{items.length ? "Lo hecho está plegado abajo." : "Escribe arriba para añadir lo primero."}</span>
          </div>
        )}
      </div>

      <footer className="list-panel__foot">
        {doneCount ? (
          <button
            type="button"
            className="list-panel__fold"
            onClick={() => setShowDone((value) => !value)}
            aria-expanded={showDone}
          >
            {showDone ? "Ocultar hechos" : `Ver ${doneCount} ${doneCount === 1 ? "hecho" : "hechos"}`}
          </button>
        ) : (
          <span>Nada hecho todavía</span>
        )}
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
