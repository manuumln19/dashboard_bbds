import { useState } from "react";
import { ArrowUpRight, Plus, ShoppingBasket } from "lucide-react";
import { isLegacyDrawing } from "../lib/listItems";
import { useRecentlyDone } from "../hooks/useRecentlyDone";
import { CheckMark } from "./CheckMark";
import { SeasonMark } from "./SeasonDecor";

const VISIBLE = 6;

// `children`: el pósit de las notas, pegado en la esquina de la tarjeta.
export function TodayShopping({ lists, onOpenLists, children }) {
  const [text, setText] = useState("");
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
    if (!text.trim()) return;
    lists.addItem("shopping", text);
    setText("");
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
        <button type="button" className="today-link" onClick={onOpenLists}>
          Listas
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
        <p className="today-shopping__empty">No falta nada.</p>
      )}

      {children}

      <form className="today-shopping__add" onSubmit={submit}>
        <input
          type="text"
          value={text}
          maxLength={160}
          placeholder="Añadir a la compra…"
          aria-label="Añadir a la compra"
          enterKeyHint="done"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" aria-label="Añadir" disabled={!text.trim()}>
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </form>
    </article>
  );
}
