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
import { groupByAisle } from "../lib/aisles";
import { usualShopping } from "../lib/usualShopping";
import { CheckMark } from "./CheckMark";
import { Sticker } from "./SeasonDecor";
import { TodoBadges, TodoMetaFields } from "./TodoFields";

function dueTimestamp(item) {
  if (!item.dueOn) return Infinity;
  const date = new Date(`${item.dueOn}T${item.dueAt || "23:59"}:00`);
  const time = date.getTime();
  return Number.isFinite(time) ? time : Infinity;
}

function dayKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Las tareas, por cuándo tocan: lo atrasado entra en «Hoy».
function groupByWhen(items, now) {
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const groups = [
    { label: "Hoy", items: [] },
    { label: "Mañana", items: [] },
    { label: "Más adelante", items: [] },
    { label: "Sin fecha", items: [] },
  ];
  items.forEach((item) => {
    if (!item.dueOn) groups[3].items.push(item);
    else if (item.dueOn <= today) groups[0].items.push(item);
    else if (item.dueOn === tomorrow) groups[1].items.push(item);
    else groups[2].items.push(item);
  });
  return groups.filter((group) => group.items.length);
}

export function ListCard({
  listId,
  title,
  subtitle,
  Icon,
  sticker,
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
  // Lo pendiente arriba y lo hecho debajo, siempre a la vista pero atenuado:
  // se deshace con un toque y la lista no se queda vacía.
  const openItems = sorted.filter((item) => !item.done);
  const doneItems = sorted.filter((item) => item.done);
  const openCount = openItems.length;
  const doneCount = doneItems.length;
  const groups = isTasks ? groupByWhen(openItems, now) : [];
  const usual = isTasks ? [] : usualShopping(openItems.map((item) => item.text), 8);
  const aisles = isTasks ? [] : groupByAisle(openItems);
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

  // La compra va en etiquetas: se marca tocándola y se borra con la cruz.
  function renderChip(item) {
    return (
      <span key={item.id} className={`shop-chip${item.done ? " is-done" : ""}`}>
        <button
          type="button"
          className="shop-chip__main"
          onClick={() => onToggle(item)}
          aria-pressed={item.done}
          aria-label={`${item.done ? "Desmarcar" : "Marcar como comprado"}: ${item.text}`}
        >
          {isLegacyDrawing(item) ? <img className="task-drawing" src={item.drawing} alt={item.text} /> : item.text}
        </button>
        <button type="button" className="shop-chip__remove" onClick={() => onRemove(item)} aria-label={`Borrar: ${item.text}`}>
          <X size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      </span>
    );
  }

  const emptyState = (
    <div className="empty-state empty-state--list">
      {sticker ? <Sticker name={sticker} size={72} /> : <Icon size={35} strokeWidth={1.25} aria-hidden="true" />}
      <strong>{items.length ? "Todo hecho" : "La lista está vacía"}</strong>
      <span>{items.length ? "Nada pendiente. Bien." : "Escribe arriba para añadir lo primero."}</span>
    </div>
  );

  function renderItem(item) {
    return (
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
    );
  }

  return (
    <article className={`list-panel list-panel--${listId}`}>
      <header className="list-panel__head">
        <div className="list-panel__title">
          {sticker ? (
            <Sticker name={sticker} size={54} className="list-panel__sticker" />
          ) : (
            <span className="list-panel__icon" aria-hidden="true">
              <Icon size={23} strokeWidth={1.7} />
            </span>
          )}
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
        {isTasks ? (
          openItems.length ? (
            groups.map((group) => (
              <section key={group.label} className={`list-panel__group${group.label === "Hoy" ? " is-today" : ""}`}>
                <h3>{group.label}</h3>
                <ul className="task-list">{group.items.map(renderItem)}</ul>
              </section>
            ))
          ) : (
            emptyState
          )
        ) : openItems.length ? (
          // Por pasillos, en el orden del súper; con uno solo, sin título.
          aisles.length > 1 ? (
            <div className="shop-aisles">
              {aisles.map((aisle) => (
                <section key={aisle.id} className="shop-aisle" aria-label={aisle.label}>
                  <h3>{aisle.label}</h3>
                  <div className="shop-chips">{aisle.items.map(renderChip)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className="shop-chips">{openItems.map(renderChip)}</div>
          )
        ) : (
          emptyState
        )}

        {!isTasks && usual.length ? (
          <section className="list-panel__usual" aria-label="Lo de siempre">
            <h3>Lo de siempre</h3>
            <div className="shop-chips">
              {usual.map((text) => (
                <button key={text} type="button" className="shop-chip is-usual" onClick={() => onAdd(listId, text)}>
                  <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                  {text}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {doneItems.length ? (
          <section className="list-panel__done" aria-label="Hecho">
            <h3>Hecho</h3>
            {isTasks ? (
              <ul className="task-list">{doneItems.map(renderItem)}</ul>
            ) : (
              <div className="shop-chips">{doneItems.map(renderChip)}</div>
            )}
          </section>
        ) : null}
      </div>

      <footer className="list-panel__foot">
        <span>
          {doneCount ? `${doneCount} ${doneCount === 1 ? "hecho" : "hechos"}` : "Nada hecho todavía"}
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
