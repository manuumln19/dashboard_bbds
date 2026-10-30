import { memo, useRef, useState } from "react";
import { ArrowUpRight, Check, Plus, ShoppingBasket, StickyNote } from "lucide-react";
import { isLegacyDrawing } from "../lib/listItems";
import { useRecentlyDone } from "../hooks/useRecentlyDone";
import { CheckMark } from "./CheckMark";
import { SeasonMark } from "./SeasonDecor";

const VISIBLE = 6;

// `onWriteNote` abre la hoja de nota nueva; las notas viven sueltas en Hoy.
export const TodayShopping = memo(function TodayShopping({ lists, onOpenLists, onWriteNote }) {
  // Campo no controlado: escribir no redibuja la tarjeta (solo si pasa de
  // vacío a lleno, para el botón «Añadir»).
  const inputRef = useRef(null);
  const [hasText, setHasText] = useState(false);
  const recent = useRecentlyDone();
  const shopping = lists.items.filter((item) => item.listId === "shopping");
  const open = shopping.filter((item) => !item.done);
  const shown = shopping.filter((item) => !item.done || recent.ids.has(item.id));
  const hidden = shown.length - VISIBLE;

  function toggle(item) {
    if (item.done) recent.forget(item.id);
    else recent.mark(item.id);
    lists.toggleItem(item);
  }

  function submit(event) {
    event.preventDefault();
    const input = inputRef.current;
    const value = input ? input.value.trim() : "";
    if (!value) return;
    lists.addItem("shopping", value);
    if (input) input.value = "";
    setHasText(false);
  }

  return (
    <article className="card today-shopping" aria-labelledby="today-shopping-title">
      <header className="today-card__head">
        <h2 id="today-shopping-title">
          <ShoppingBasket size={18} strokeWidth={1.8} aria-hidden="true" />
          Compra
          {open.length ? <span className="today-count">{open.length}</span> : null}
          <SeasonMark />
        </h2>
        {onWriteNote ? (
          <button type="button" className="today-link today-link--note" onClick={onWriteNote}>
            <StickyNote size={15} strokeWidth={2} aria-hidden="true" />
            Nota
          </button>
        ) : null}
        <button type="button" className="today-link" onClick={onOpenLists}>
          Compra
          <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      {shown.length ? (
        <ul className="today-shopping__list">
          {shown.slice(0, VISIBLE).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.done ? "is-done" : ""}
                onClick={() => toggle(item)}
                aria-label={`${item.done ? "Desmarcar" : "Marcar como comprado"}: ${item.text}`}
              >
                <CheckMark checked={item.done} small />
                {isLegacyDrawing(item) ? (
                  <img className="today-shopping__drawing" src={item.drawing} alt={item.text} />
                ) : (
                  <span>{item.text}</span>
                )}
              </button>
            </li>
          ))}
          {hidden > 0 ? (
            <li className="today-shopping__more">
              <button type="button" onClick={onOpenLists}>
                y {hidden} más
              </button>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="today-shopping__empty">
          <Check size={22} strokeWidth={1.8} aria-hidden="true" />
          <strong>No falta nada</strong>
          <span>La despensa está al día.</span>
        </p>
      )}

      <form className="today-shopping__add" onSubmit={submit}>
        <input
          type="text"
          ref={inputRef}
          defaultValue=""
          maxLength={160}
          placeholder="Añadir a la compra…"
          aria-label="Añadir a la compra"
          enterKeyHint="done"
          onChange={(event) => setHasText(event.target.value.trim() !== "")}
        />
        <button type="submit" aria-label="Añadir" disabled={!hasText}>
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </form>
    </article>
  );
});
